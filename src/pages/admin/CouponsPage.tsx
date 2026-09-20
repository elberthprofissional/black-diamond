import { useState } from "react";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Loading } from "../../components/ui/Loading";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import {
  createCoupon,
  deleteCoupon,
  listCoupons,
  toErrorMessage,
  updateCoupon,
} from "../../services/api";
import type { Coupon, CouponDiscountType } from "../../types";
import { formatCurrency } from "../../utils/format";

interface FormState {
  id: string | null;
  code: string;
  title: string;
  discountType: CouponDiscountType;
  discountValue: string;
  maxUses: string;
  expiresDate: string;
}

const EMPTY_FORM: FormState = {
  id: null,
  code: "",
  title: "",
  discountType: "fixed",
  discountValue: "",
  maxUses: "1",
  expiresDate: "",
};

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function toExpiryISO(dateInput: string): string | null {
  if (!dateInput) return null;
  const d = new Date(`${dateInput}T23:59:59`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function discountLabel(c: Pick<Coupon, "discount_type" | "discount_value">): string {
  return c.discount_type === "percent"
    ? `${c.discount_value}%`
    : formatCurrency(c.discount_value);
}

export function CouponsPage() {
  const { activeMembership } = useAuth();
  const shopId = activeMembership?.barbershop_id ?? "";
  const { showToast } = useToast();

  const { data, loading, error, reload } = useAsyncData(() => listCoupons(shopId), [shopId]);

  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState(false);

  const coupons = data ?? [];

  const openNew = () => setForm({ ...EMPTY_FORM });

  const openEdit = (c: Coupon) =>
    setForm({
      id: c.id,
      code: c.code,
      title: c.title ?? "",
      discountType: c.discount_type,
      discountValue: String(c.discount_value),
      maxUses: String(c.max_uses),
      expiresDate: toDateInput(c.expires_at),
    });

  const closeModal = () => {
    setForm(null);
    setFormError(null);
  };

  const save = async () => {
    if (!form) return;
    const code = form.code.trim().toUpperCase();
    const discountValue = Number(form.discountValue.replace(",", "."));
    const maxUses = Number(form.maxUses);
    if (!/^[A-Za-z0-9_-]{2,40}$/.test(code.trim())) {
      return setFormError(
        "Código de 2 a 40 caracteres, sem espaços ou acentos. Use letras, números, - ou _."
      );
    }
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      return setFormError("Informe um valor de desconto maior que zero.");
    }
    if (!Number.isInteger(maxUses) || maxUses < 1) {
      return setFormError("Informe um limite de usos de pelo menos 1.");
    }

    const payload = {
      code,
      title: form.title.trim() || null,
      discountType: form.discountType,
      discountValue,
      maxUses,
      expiresAt: toExpiryISO(form.expiresDate),
    };

    setBusy(true);
    setFormError(null);
    try {
      if (form.id) {
        await updateCoupon(form.id, {
          code,
          title: form.title.trim() || null,
          discount_type: form.discountType,
          discount_value: discountValue,
          max_uses: maxUses,
          expires_at: toExpiryISO(form.expiresDate),
        });
        showToast("Cupom atualizado.", "success");
      } else {
        await createCoupon({ shopId, ...payload });
        showToast("Cupom criado.", "success");
      }
      closeModal();
      reload();
    } catch (e) {
      setFormError(toErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (c: Coupon) => {
    try {
      await updateCoupon(c.id, { is_active: !c.is_active });
      reload();
    } catch (e) {
      showToast(toErrorMessage(e), "error");
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteCoupon(toDelete.id);
      showToast("Cupom removido.", "success");
      setToDelete(null);
      reload();
    } catch (e) {
      showToast(toErrorMessage(e), "error");
      setDeleting(false);
    }
  };

  const formModal = form !== null;

  return (
    <div className="page">
      <div className="page-heading page-heading--row">
        <div>
          <h2>Cupons</h2>
          <p className="text-muted">
            Descontos que o cliente aplica ao agendar. O valor é calculado e gravado pelo sistema.
          </p>
        </div>
        <Button onClick={openNew}>+ Novo cupom</Button>
      </div>

      {loading ? (
        <Loading label="Carregando cupons..." />
      ) : error ? (
        <EmptyState
          icon="!"
          title="Erro ao carregar"
          description={error}
          action={<button onClick={reload} className="btn btn--ghost">Tentar de novo</button>}
        />
      ) : coupons.length === 0 ? (
        <EmptyState
          icon="◆"
          title="Sem cupons ainda"
          description="Crie um cupom com valor fixo ou porcentagem e informe o código aos clientes."
          action={<Button onClick={openNew}>+ Novo cupom</Button>}
        />
      ) : (
        <div className="coupons-admin">
          {coupons.map((c) => {
            const usedUp = c.used_count >= c.max_uses;
            const expired = Boolean(
              c.expires_at && new Date(c.expires_at).getTime() < Date.now()
            );
            const dead = usedUp || expired;
            return (
              <div key={c.id} className={`coupon-card ${!c.is_active ? "is-muted" : ""}`}>
                <div className="coupon-card__top">
                  <span className="coupon-card__code">{c.code}</span>
                  <span className={`badge coupon-card__discount ${c.discount_type === "percent" ? "badge--percent" : ""}`}>
                    {discountLabel(c)}
                  </span>
                </div>
                {c.title ? <p className="coupon-card__title">{c.title}</p> : null}
                <div className="coupon-card__meta">
                  <span>
                    Usos: <strong>{c.used_count}</strong>/{c.max_uses}
                  </span>
                  <span>{c.expires_at ? `Válido até ${c.expires_at.slice(0, 10)}` : "Sem validade"}</span>
                </div>
                <div className="coupon-card__actions">
                  <button
                    type="button"
                    className={`toggle ${c.is_active ? "is-on" : ""}`}
                    role="switch"
                    aria-checked={c.is_active}
                    aria-label={`Ativar ${c.code}`}
                    onClick={() => toggleActive(c)}
                  >
                    <span />
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(c)}>
                    Editar
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm btn--danger-ghost" onClick={() => setToDelete(c)}>
                    Apagar
                  </button>
                </div>
                {dead && c.is_active ? (
                  <p className="coupon-card__note">
                    {usedUp ? "Limite de usos atingido" : "Expirado"}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={formModal}
        onClose={closeModal}
        title={form?.id ? "Editar cupom" : "Novo cupom"}
        footer={
          <div className="modal-actions">
            <Button variant="ghost" onClick={closeModal}>
              Cancelar
            </Button>
            <Button onClick={save} loading={busy}>
              Salvar
            </Button>
          </div>
        }
      >
        {form ? (
          <div className="form-stack">
            <Input
              label="Código"
              name="cup-code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="Ex.: BLACK10"
              hint="O cliente digita exatamente esse código ao agendar."
              autoCapitalize="characters"
            />
            <Input
              label="Título (opcional)"
              name="cup-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ex.: Primeiro corte — R$10 de desconto"
            />
            <div className="form-row">
              <div className="field">
                <label htmlFor="cup-type">Tipo de desconto</label>
                <select
                  id="cup-type"
                  className="input"
                  value={form.discountType}
                  onChange={(e) => setForm({ ...form, discountType: e.target.value as CouponDiscountType })}
                >
                  <option value="fixed">Valor fixo (R$)</option>
                  <option value="percent">Porcentagem (%)</option>
                </select>
              </div>
              <Input
                label="Desconto"
                name="cup-value"
                type="number"
                min="0.01"
                step="0.01"
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                placeholder={form.discountType === "percent" ? "Ex.: 10" : "Ex.: 10.00"}
              />
            </div>
            <div className="form-row">
              <Input
                label="Limite de usos"
                name="cup-uses"
                type="number"
                min="1"
                step="1"
                value={form.maxUses}
                onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
              />
              <Input
                label="Validade (opcional)"
                name="cup-expires"
                type="date"
                value={form.expiresDate}
                onChange={(e) => setForm({ ...form, expiresDate: e.target.value })}
              />
            </div>
            {formError ? <p className="form-error">{formError}</p> : null}
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Remover cupom?"
        description={toDelete ? `O cupom "${toDelete.code}" será removido. Agendamentos já feitos não são afetados.` : undefined}
        confirmLabel="Remover"
        danger
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}