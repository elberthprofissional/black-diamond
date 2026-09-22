import { useRef, useState } from "react";
import { Avatar } from "./ui/Avatar";
import { Button } from "./ui/Button";
import { Icon } from "./ui/Icon";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { toErrorMessage } from "../services/api";
import { uploadGalleryImage } from "../services/upload";

interface PhotoPickerProps {
  name?: string;
  label?: string;
  value: string | null;
  onChange: (url: string) => void;
}

export function PhotoPicker({ name, value, onChange, label }: PhotoPickerProps) {
  const { activeMembership } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shopId = activeMembership?.barbershop_id ?? "";

  const pick = async (file: File | null) => {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Selecione um arquivo de imagem (JPG, PNG, HEIC, WebP...).");
      return;
    }
    setBusy(true);
    try {
      const url = await uploadGalleryImage(shopId, file);
      onChange(url);
      showToast("Foto atualizada.", "success");
    } catch (e) {
      setError(toErrorMessage(e));
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="field">
      <label htmlFor={name ?? "photo"}>{label ?? "Foto"}</label>
      {value ? (
        <div className="gallery-upload">
          <Avatar name="" src={value} size="lg" />
          <div className="gallery-upload__actions">
            <Button variant="ghost" size="sm" loading={busy} onClick={() => fileInputRef.current?.click()}>
              Trocar
            </Button>
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => onChange("")}>
              Remover
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="gallery-upload gallery-upload--empty"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
        >
          <Icon name="camera" size={20} />
          <span>{busy ? "Enviando..." : "Escolher foto do arquivo"}</span>
          <small>JPG, PNG, HEIC ou WebP — converte para WebP automaticamente</small>
        </button>
      )}
      <input
        ref={fileInputRef}
        id={name ?? "photo"}
        type="file"
        accept="image/*"
        className="gallery-upload__input"
        onChange={(e) => void pick(e.target.files?.[0] ?? null)}
      />
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}