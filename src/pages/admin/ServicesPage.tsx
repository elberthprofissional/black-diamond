import { Scissors } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loading } from "../../components/ui/Loading";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import {
  createService,
  listServices,
  toErrorMessage,
  updateService,
} from "../../services/api";
import { formatCurrency } from "../../utils/format";
import { isValidDuration, isValidPrice } from "../../utils/validation";
import type { Service } from "../../types";

const EMPTY_FORM = { name: "", description: "", price: "", duration: "30" };

interface FormState {
  id: string | null;
  name: string;
  description: string;
  price: string;
  duration: string;
}

export function ServicesPage() {
  const { activeMembership } = useAuth();
  const shopId = activeMembership?.barbershop_id ?? "";
  const { showToast } = useToast();

  const { data, loading, error, reload } = useAsyncData(
    () => listServices(shopId),
    [shopId]
  );

  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const openNew = () => setForm({ ...EMPTY_FORM, id: null });
  const openEdit = (s: Service) =>
    setForm({
      id: s.id,
      name: s.name,
      description: s.description ?? "",
      price: String(s.price),
      duration: String(s.duration_minutes),
    });
  const close = () => {
    setForm(null);
    setFormError(null);
  };

  const save = async () => {
    if (!form) return;
    const price = Number(form.price.replace(",", "."));
    const duration = Number(form.duration);
    if (!form.name.trim()) return setFormError("Informe o nome do serviço.");
    if (!isValidPrice(price)) return setFormError("Informe um preço válido.");
    if (!isValidDuration(duration)) return setFormError("Duração entre 5 e 480 minutos.");

    setBusy(true);
    setFormError(null);
    try {
      if (form.id) {
        await updateService(form.id, {
          name: form.name.trim(),
          description: form.description.trim() || null,
          price,
          duration_minutes: duration,
        });
        showToast("Serviço atualizado.", "success");
      } else {
        await createService(shopId, {
          name: form.name.trim(),
          description: form.description.trim() || null,
          price,
          duration_minutes: duration,
        });
        showToast("Serviço criado.", "success");
      }
      close();
      reload();
    } catch (e) {
      setFormError(toErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (s: Service) => {
    try {
      await updateService(s.id, { is_active: !s.is_active });
      reload();
    } catch (e) {
      showToast(toErrorMessage(e), "error");
    }
  };

  return (
    <div className="page">
      <div className="page-heading page-heading--row">
        <div>
          <h2>Serviços</h2>
          <p className="text-muted">Os serviços ativos aparecem na página de agendamento.</p>
        </div>
        <Button onClick={openNew}>+ Novo serviço</Button>
      </div>

      {loading ? (
        <Loading label="Carregando serviços..." />
      ) : error ? (
        <EmptyState icon="!" title="Erro ao carregar" description={error} action={<button onClick={reload} className="btn btn--ghost">Tentar de novo</button>} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState icon={<Scissors size={22} strokeWidth={1.5} />} title="Nenhum serviço" description="Crie o primeiro serviço para começar a receber agendamentos." action={<Button onClick={openNew}>+ Novo serviço</Button>} />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Serviço</th>
                <th>Duração</th>
                <th>Preço</th>
                <th>Status</th>
                <th aria-label="Ações"></th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((s) => (
                <tr key={s.id} className={!s.is_active ? "row-muted" : ""}>
                  <td>
                    <strong>{s.name}</strong>
                    {s.description ? <span className="table-sub">{s.description}</span> : null}
                  </td>
                  <td>{s.duration_minutes} min</td>
                  <td>{formatCurrency(s.price)}</td>
                  <td>
                    <button
                      type="button"
                      className={`toggle ${s.is_active ? "is-on" : ""}`}
                      role="switch"
                      aria-checked={s.is_active}
                      aria-label={`Ativar ${s.name}`}
                      onClick={() => toggleActive(s)}
                    >
                      <span />
                    </button>
                  </td>
                  <td>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(s)}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={form !== null}
        onClose={close}
        title={form?.id ? "Editar serviço" : "Novo serviço"}
        footer={
          <div className="modal-actions">
            <Button variant="ghost" onClick={close}>
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
            <Input label="Nome" name="svc-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Descrição (opcional)" name="svc-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="form-grid-2">
              <Input label="Preço (R$)" name="svc-price" inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              <Input label="Duração (min)" name="svc-duration" inputMode="numeric" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
            </div>
            {formError ? <p className="form-error">{formError}</p> : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}