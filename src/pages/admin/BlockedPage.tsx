import { useMemo, useState } from "react";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loading } from "../../components/ui/Loading";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import {
  createBlockedTime,
  deleteBlockedTime,
  listBlockedTimes,
  listMembers,
  toErrorMessage,
} from "../../services/api";
import { datetimeLocalToISO, toDateTimeLocal } from "../../utils/date";
import type { BlockedTime } from "../../types";

export function BlockedPage() {
  const { activeMembership, role } = useAuth();
  const shopId = activeMembership?.barbershop_id ?? "";
  const isOwner = role === "owner" || role === "superadmin";
  const myMemberId = activeMembership?.member_id ?? "";
  const { showToast } = useToast();

  const { data, loading, error, reload } = useAsyncData(async () => {
    const [blocks, members] = await Promise.all([
      listBlockedTimes(shopId),
      isOwner ? listMembers(shopId) : Promise.resolve([]),
    ]);
    return { blocks, members };
  }, [shopId, isOwner]);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    scope: isOwner ? "shop" : "self",
    memberId: "",
    start: "",
    end: "",
    reason: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<BlockedTime | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const memberName = useMemo(() => {
    const map = new Map((data?.members ?? []).map((m) => [m.id, m.full_name]));
    return (id: string | null) => (id ? (map.get(id) ?? "Profissional") : "Barbearia (todos)");
  }, [data?.members]);

  const save = async () => {
    const errs: string[] = [];
    if (!form.start || !form.end) errs.push("Informe início e fim do bloqueio.");
    if (form.end <= form.start) errs.push("O fim deve ser depois do início.");
    if (isOwner && form.scope === "member" && !form.memberId) errs.push("Escolha o profissional.");
    if (errs.length) {
      setFormError(errs.join(" "));
      return;
    }

    setBusy(true);
    setFormError(null);
    try {
      await createBlockedTime({
        shopId,
        memberId: isOwner ? (form.scope === "member" ? form.memberId : null) : myMemberId || null,
        startAt: datetimeLocalToISO(form.start),
        endAt: datetimeLocalToISO(form.end),
        reason: form.reason.trim() || undefined,
      });
      showToast("Bloqueio criado.", "success");
      setOpen(false);
      setForm({ scope: isOwner ? "shop" : "self", memberId: "", start: "", end: "", reason: "" });
      reload();
    } catch (e) {
      setFormError(toErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleteBusy(true);
    try {
      await deleteBlockedTime(toDelete.id);
      showToast("Bloqueio removido.", "success");
      setToDelete(null);
      reload();
    } catch (e) {
      showToast(toErrorMessage(e), "error");
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="page-heading page-heading--row">
        <div>
          <h2>Bloqueios</h2>
          <p className="text-muted">
            Férias, feriados, dia inteiro ou horário específico. Horários bloqueados não aparecem para o cliente.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>+ Novo bloqueio</Button>
      </div>

      {loading ? (
        <Loading label="Carregando bloqueios..." />
      ) : error ? (
        <EmptyState icon="!" title="Erro ao carregar" description={error} action={<button onClick={reload} className="btn btn--ghost">Tentar de novo</button>} />
      ) : (data?.blocks ?? []).length === 0 ? (
        <EmptyState icon="🔒" title="Sem bloqueios" description="Não há períodos bloqueados no momento." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Início</th>
                <th>Fim</th>
                <th>Abrangência</th>
                <th>Motivo</th>
                <th aria-label="Ações"></th>
              </tr>
            </thead>
            <tbody>
              {(data?.blocks ?? []).map((b) => (
                <tr key={b.id}>
                  <td>{toDateTimeLocal(b.start_at)}</td>
                  <td>{toDateTimeLocal(b.end_at)}</td>
                  <td>{memberName(b.member_id)}</td>
                  <td className="muted">{b.reason ?? "—"}</td>
                  <td>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setToDelete(b)}>
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Novo bloqueio"
        footer={
          <div className="modal-actions">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} loading={busy}>
              Salvar
            </Button>
          </div>
        }
      >
        <div className="form-stack">
          {isOwner ? (
            <Select
              label="Abrangência"
              name="block-scope"
              value={form.scope}
              onChange={(e) => setForm({ ...form, scope: e.target.value })}
            >
              <option value="shop">Barbearia inteira</option>
              <option value="member">Só um profissional</option>
            </Select>
          ) : null}

          {isOwner && form.scope === "member" ? (
            <Select
              label="Profissional"
              name="block-member"
              value={form.memberId}
              onChange={(e) => setForm({ ...form, memberId: e.target.value })}
            >
              <option value="">Selecione</option>
              {(data?.members ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </Select>
          ) : null}

          <div className="form-grid-2">
            <Input label="Início" type="datetime-local" name="block-start" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
            <Input label="Fim" type="datetime-local" name="block-end" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
          </div>
          <Input label="Motivo (opcional)" name="block-reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Ex.: feriado, férias, compromisso" />
          {formError ? <p className="form-error">{formError}</p> : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Remover bloqueio"
        description="Os horários voltam a ficar disponíveis imediatamente."
        confirmLabel="Remover"
        danger
        busy={deleteBusy}
        onCancel={() => setToDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}