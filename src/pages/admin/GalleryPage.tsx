import { useState } from "react";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Loading } from "../../components/ui/Loading";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import {
  createGalleryItem,
  deleteGalleryItem,
  listGallery,
  toErrorMessage,
  updateGalleryItem,
} from "../../services/api";
import type { GalleryItem } from "../../types";

interface FormState {
  id: string | null;
  caption: string;
  imageUrl: string;
}

const EMPTY_FORM: FormState = { id: null, caption: "", imageUrl: "" };

export function GalleryPage() {
  const { activeMembership } = useAuth();
  const shopId = activeMembership?.barbershop_id ?? "";
  const { showToast } = useToast();

  const { data, loading, error, reload } = useAsyncData(() => listGallery(shopId), [shopId]);

  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<GalleryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const itemsAll = data ?? [];

  const openNew = () => setForm({ ...EMPTY_FORM });

  const openEdit = (g: GalleryItem) =>
    setForm({ id: g.id, caption: g.caption ?? "", imageUrl: g.image_url ?? "" });

  const closeModal = () => {
    setForm(null);
    setFormError(null);
  };

  const save = async () => {
    if (!form) return;
    if (!form.caption.trim() && !form.imageUrl.trim()) {
      return setFormError("Informe uma legenda ou cole o link da foto.");
    }
    const imageUrl = form.imageUrl.trim() || null;
    if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
      return setFormError("O link da foto deve começar com http:// ou https://.");
    }

    setBusy(true);
    setFormError(null);
    try {
      if (form.id) {
        await updateGalleryItem(form.id, {
          image_url: imageUrl,
          caption: form.caption.trim() || null,
        });
        showToast("Foto atualizada.", "success");
      } else {
        const nextPos = itemsAll.reduce((m, g) => Math.max(m, g.position), -1) + 1;
        await createGalleryItem({
          shopId,
          imageUrl,
          caption: form.caption.trim() || null,
          position: nextPos,
        });
        showToast("Quadro adicionado.", "success");
      }
      closeModal();
      reload();
    } catch (e) {
      setFormError(toErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= itemsAll.length) return;
    const a = itemsAll[index];
    const b = itemsAll[target];
    try {
      await Promise.all([
        updateGalleryItem(a.id, { position: b.position }),
        updateGalleryItem(b.id, { position: a.position }),
      ]);
      reload();
    } catch (e) {
      showToast(toErrorMessage(e), "error");
    }
  };

  const toggleActive = async (g: GalleryItem) => {
    try {
      await updateGalleryItem(g.id, { is_active: !g.is_active });
      reload();
    } catch (e) {
      showToast(toErrorMessage(e), "error");
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteGalleryItem(toDelete.id);
      showToast("Quadro removido.", "success");
      setToDelete(null);
      reload();
    } catch (e) {
      showToast(toErrorMessage(e), "error");
      setDeleting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-heading page-heading--row">
        <div>
          <h2>Galeria</h2>
          <p className="text-muted">As fotos dos cortes aparecem na página inicial. Sem foto, mostra um espaço com a legenda.</p>
        </div>
        <Button onClick={openNew}>+ Novo quadro</Button>
      </div>

      {loading ? (
        <Loading label="Carregando galeria..." />
      ) : error ? (
        <EmptyState
          icon="!"
          title="Erro ao carregar"
          description={error}
          action={<button onClick={reload} className="btn btn--ghost">Tentar de novo</button>}
        />
      ) : itemsAll.length === 0 ? (
        <EmptyState
          icon="📷"
          title="Sem fotos ainda"
          description="Adicione o primeiro quadro com a foto de um corte."
          action={<Button onClick={openNew}>+ Novo quadro</Button>}
        />
      ) : (
        <div className="gallery-admin">
          {itemsAll.map((g, i) => (
            <div key={g.id} className={`gallery-item-card ${!g.is_active ? "is-muted" : ""}`}>
              <div className="gallery-item-card__thumb">
                {g.image_url ? (
                  <img src={g.image_url} alt={g.caption ?? "Foto da galeria"} />
                ) : (
                  <div className="gallery-item-card__placeholder">
                    <Icon name="camera" size={22} />
                    <span>sem foto</span>
                  </div>
                )}
              </div>
              <div className="gallery-item-card__body">
                <strong>{g.caption || "Sem legenda"}</strong>
                <div className="gallery-item-card__actions">
                  <button type="button" className="icon-btn" title="Mover para cima" disabled={i === 0} onClick={() => move(i, -1)}>
                    <Icon name="chevronLeft" size={15} />
                  </button>
                  <button type="button" className="icon-btn" title="Mover para baixo" disabled={i === itemsAll.length - 1} onClick={() => move(i, 1)}>
                    <Icon name="chevronRight" size={15} />
                  </button>
                  <button
                    type="button"
                    className={`toggle ${g.is_active ? "is-on" : ""}`}
                    role="switch"
                    aria-checked={g.is_active}
                    aria-label={`Ativar ${g.caption ?? "quadro"}`}
                    onClick={() => toggleActive(g)}
                  >
                    <span />
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(g)}>
                    Editar
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm btn--danger-ghost" onClick={() => setToDelete(g)}>
                    Apagar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={form !== null}
        onClose={closeModal}
        title={form?.id ? "Editar quadro" : "Novo quadro"}
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
              label="Legenda"
              name="gal-caption"
              value={form.caption}
              onChange={(e) => setForm({ ...form, caption: e.target.value })}
              placeholder="Ex.: Corte degradê"
            />
            <Input
              label="Link da foto (opcional)"
              name="gal-url"
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              placeholder="https://..."
            />
            {formError ? <p className="form-error">{formError}</p> : null}
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Remover quadro?"
        description={toDelete ? `O quadro "${toDelete.caption ?? "sem legenda"}" será removido da página inicial.` : undefined}
        confirmLabel="Remover"
        danger
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}