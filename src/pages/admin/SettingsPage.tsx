import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Loading } from "../../components/ui/Loading";
import { HoursEditor, normalizeHours } from "../../components/HoursEditor";
import type { HourRow } from "../../components/HoursEditor";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import {
  fetchShop,
  listBusinessHours,
  replaceBusinessHours,
  toErrorMessage,
  updateShop,
} from "../../services/api";
import { readableInk } from "../../pages/public/BookingPage";
import type { BarbershopSettings } from "../../types";

export function SettingsPage() {
  const { activeMembership } = useAuth();
  const shopId = activeMembership?.barbershop_id ?? "";
  const { showToast } = useToast();

  const { data, loading, error, reload } = useAsyncData(async () => {
    const [shop, hours] = await Promise.all([fetchShop(shopId), listBusinessHours(shopId)]);
    return { shop, hours };
  }, [shopId]);

  const [form, setForm] = useState<{
    name: string;
    slug: string;
    description: string;
    about: string;
    address: string;
    phone: string;
    whatsapp: string;
    instagram: string;
    logo_url: string;
    hero_image_url: string;
    primary_color: string;
  } | null>(null);

  const [settings, setSettings] = useState<BarbershopSettings | null>(null);
  const [hours, setHours] = useState<HourRow[] | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    setForm({
      name: data.shop.name,
      slug: data.shop.slug,
      description: data.shop.description ?? "",
      about: data.shop.about ?? "",
      address: data.shop.address ?? "",
      phone: data.shop.phone ?? "",
      whatsapp: data.shop.whatsapp ?? "",
      instagram: data.shop.instagram ?? "",
      logo_url: data.shop.logo_url ?? "",
      hero_image_url: data.shop.hero_image_url ?? "",
      primary_color: data.shop.primary_color,
    });
    setSettings({
      show_address: data.shop.settings.show_address ?? true,
      show_instagram: data.shop.settings.show_instagram ?? true,
      show_whatsapp: data.shop.settings.show_whatsapp ?? true,
      show_credits: data.shop.settings.show_credits ?? true,
      credits_text: data.shop.settings.credits_text ?? data.shop.name,
      barberflow_branding: data.shop.settings.barberflow_branding ?? false,
    });
    setHours(normalizeHours(data.hours));
  }, [data]);

  if (loading) return <Loading label="Carregando configurações..." />;
  if (error) {
    return (
      <EmptyState
        icon="!"
        title="Erro ao carregar"
        description={error}
        action={<button onClick={reload} className="btn btn--ghost">Tentar de novo</button>}
      />
    );
  }
  if (!form || !settings || !hours) return <Loading label="Preparando formulário..." />;

  const set = (patch: Partial<typeof form>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const setSetting = (patch: Partial<BarbershopSettings>) =>
    setSettings((s) => (s ? { ...s, ...patch } : s));

  const save = async () => {
    if (!form) return;
    if (!form.name.trim()) {
      showToast("Informe o nome da barbearia.", "error");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(form.slug)) {
      showToast("Slug inválido: use minúsculas, números e hífens.", "error");
      return;
    }

    setSaveBusy(true);
    try {
      await updateShop(shopId, {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || null,
        about: form.about.trim() || null,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        whatsapp: form.whatsapp.replace(/\D/g, "").trim() || null,
        instagram: form.instagram.trim() || null,
        logo_url: form.logo_url.trim() || null,
        hero_image_url: form.hero_image_url.trim() || null,
        primary_color: form.primary_color,
        settings,
      });
      await replaceBusinessHours(shopId, hours);
      document.documentElement.style.setProperty("--accent", form.primary_color);
      document.documentElement.style.setProperty("--accent-ink", readableInk(form.primary_color));
      showToast("Configurações salvas.", "success");
    } catch (e) {
      showToast(toErrorMessage(e), "error");
    } finally {
      setSaveBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="page-heading">
        <h2>Configuração da página</h2>
        <p className="text-muted">
          Esses dados alimentam a página pública de agendamento ({window.location.origin}/agendar/
          {form.slug}). O rodapé e a cor de destaque também são controlados aqui.
        </p>
      </div>

      <div className="settings-grid">
        <section className="card">
          <div className="card__head">
            <h3>Identidade e contato</h3>
          </div>
          <div className="form-stack">
            <div className="form-grid-2">
              <Input label="Nome" name="st-name" value={form.name} onChange={(e) => set({ name: e.target.value })} />
              <Input label="Slug (endereço)" name="st-slug" value={form.slug} onChange={(e) => set({ slug: e.target.value })} hint="Usado na URL pública." />
            </div>
            <Input label="Descrição curta" name="st-desc" value={form.description} onChange={(e) => set({ description: e.target.value })} />
            <Input label="Sobre (texto principal)" name="st-about" value={form.about} onChange={(e) => set({ about: e.target.value })} />
            <Input label="Endereço" name="st-address" value={form.address} onChange={(e) => set({ address: e.target.value })} />
            <div className="form-grid-2">
              <Input label="Telefone" name="st-phone" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
              <Input label="WhatsApp (com DDD)" name="st-wa" value={form.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} />
            </div>
            <Input label="Instagram" name="st-ig" value={form.instagram} onChange={(e) => set({ instagram: e.target.value })} placeholder="minha.barbearia" />
            <div className="form-grid-2">
              <Input label="URL do logo" name="st-logo" value={form.logo_url} onChange={(e) => set({ logo_url: e.target.value })} />
              <Input label="URL da imagem principal" name="st-hero" value={form.hero_image_url} onChange={(e) => set({ hero_image_url: e.target.value })} />
            </div>
            <div className="form-grid-2">
              <Input label="Cor de destaque" type="color" name="st-color" value={form.primary_color} onChange={(e) => set({ primary_color: e.target.value })} />
              <Input label="Cor (hex)" name="st-color-hex" value={form.primary_color} onChange={(e) => set({ primary_color: e.target.value })} />
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card__head">
            <h3>Rodapé da página pública</h3>
          </div>
          <div className="form-stack">
            <ToggleRow label="Mostrar endereço" checked={settings.show_address} onChange={(v) => setSetting({ show_address: v })} />
            <ToggleRow label="Mostrar Instagram" checked={settings.show_instagram} onChange={(v) => setSetting({ show_instagram: v })} />
            <ToggleRow label="Mostrar WhatsApp" checked={settings.show_whatsapp} onChange={(v) => setSetting({ show_whatsapp: v })} />
            <ToggleRow label="Mostrar créditos do sistema" checked={settings.show_credits} onChange={(v) => setSetting({ show_credits: v })} />
            {settings.show_credits ? (
              <Input label="Texto dos créditos" name="st-credits" value={settings.credits_text} onChange={(e) => setSetting({ credits_text: e.target.value })} />
            ) : null}
            <ToggleRow label={"Marca \"BarberFlow\" (futuro)"} checked={settings.barberflow_branding} onChange={(v) => setSetting({ barberflow_branding: v })} hint="Exibe a assinatura da plataforma no rodapé." />
          </div>
        </section>
      </div>

      <section className="card" style={{ marginTop: 20 }}>
        <div className="card__head">
          <h3>Horário de funcionamento</h3>
          <span className="muted">A disponibilidade considera o horário da barbearia E o do profissional.</span>
        </div>
        <HoursEditor rows={hours} onChange={setHours} />
      </section>

      <div className="page-actions">
        <Button onClick={save} loading={saveBusy}>
          Salvar alterações
        </Button>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <div className="toggle-row">
      <div>
        <strong className="toggle-row__label">{label}</strong>
        {hint ? <span className="toggle-row__hint">{hint}</span> : null}
      </div>
      <button
        type="button"
        className={`toggle ${checked ? "is-on" : ""}`}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </div>
  );
}