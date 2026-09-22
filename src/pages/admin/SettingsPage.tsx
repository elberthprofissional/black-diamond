import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Icon } from "../../components/ui/Icon";
import type { IconName } from "../../components/ui/Icon";
import { Input } from "../../components/ui/Input";
import { Loading } from "../../components/ui/Loading";
import { HoursEditor, normalizeHours } from "../../components/HoursEditor";
import { PhotoPicker } from "../../components/PhotoPicker";
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
import { ServicesPage } from "./ServicesPage";
import { TeamPage } from "./TeamPage";
import { CouponsPage } from "./CouponsPage";
import { BlockedPage } from "./BlockedPage";
import { GalleryPage } from "./GalleryPage";
import { ProfilePage } from "./ProfilePage";

type SettingsTab =
  | "identity"
  | "contact"
  | "profile"
  | "appearance"
  | "services"
  | "team"
  | "hours"
  | "blocks"
  | "coupons"
  | "gallery"
  | "footer";

const FORM_TABS: SettingsTab[] = ["identity", "contact", "appearance", "footer", "hours"];

const TABS: { id: SettingsTab; label: string; icon: IconName }[] = [
  { id: "identity", label: "Identidade", icon: "user" },
  { id: "contact", label: "Contato", icon: "phone" },
  { id: "profile", label: "Perfil", icon: "user" },
  { id: "appearance", label: "Aparência", icon: "sliders" },
  { id: "services", label: "Serviços", icon: "scissors" },
  { id: "team", label: "Equipe", icon: "users" },
  { id: "hours", label: "Horário de funcionamento", icon: "clock" },
  { id: "blocks", label: "Bloqueios", icon: "ban" },
  { id: "coupons", label: "Cupons", icon: "percent" },
  { id: "gallery", label: "Galeria", icon: "camera" },
  { id: "footer", label: "Rodapé", icon: "info" },
];

export function SettingsPage() {
  const { activeMembership, role } = useAuth();
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

  const [tab, setTab] = useState<SettingsTab | null>(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 720px)").matches
      ? null
      : "identity",
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 720px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setTab(null);
      else setTab((t) => t ?? "identity");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

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
        <span className="eyebrow">Sistema</span>
        <h2>Configurações</h2>
        <p className="text-muted">
          Identidade, contato, horários e aparência da página de agendamento do cliente.
        </p>
      </div>

      <div className={`settings-layout${tab ? " is-detail" : ""}`}>
        <nav className="settings-nav" aria-label="Seções de configuração">
          <span className="settings-nav__title">Configurações</span>
          {TABS.filter((t) => t.id !== "appearance" || role === "superadmin").map((t) => (
            <button
              key={t.id}
              type="button"
              className={`settings-nav__item${tab === t.id ? " is-active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              <Icon name={t.icon} size={16} />
              {t.label}
            </button>
          ))}
        </nav>

        <section className="settings-panel">
          {tab ? (
            <>
              {FORM_TABS.includes(tab) ? (
                <>
                  <div className="settings-panel__head">
                    <button type="button" className="settings-back" onClick={() => setTab(null)}>
                      <Icon name="chevronLeft" size={16} />
                      Voltar
                    </button>
                    <h3>{TABS.find((t) => t.id === tab)?.label}</h3>
                  </div>

                  {tab === "identity" ? (
                    <section className="card">
                      <div className="card__head">
                        <h3>Nome e textos</h3>
                      </div>
                      <div className="form-stack">
                        <div className="form-grid-2">
                          <Input label="Nome" name="st-name" value={form.name} onChange={(e) => set({ name: e.target.value })} />
                          <Input label="Slug (endereço)" name="st-slug" value={form.slug} onChange={(e) => set({ slug: e.target.value })} hint="Usado na URL pública." />
                        </div>
                        <Input label="Descrição curta" name="st-desc" value={form.description} onChange={(e) => set({ description: e.target.value })} />
                        <Input label="Sobre (texto principal)" name="st-about" value={form.about} onChange={(e) => set({ about: e.target.value })} />
                      </div>
                    </section>
                  ) : null}

                  {tab === "contact" ? (
                    <section className="card">
                      <div className="card__head">
                        <h3>Canais de atendimento</h3>
                      </div>
                      <div className="form-stack">
                        <Input label="Endereço" name="st-address" value={form.address} onChange={(e) => set({ address: e.target.value })} />
                        <div className="form-grid-2">
                          <Input label="Telefone" name="st-phone" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
                          <Input label="WhatsApp (com DDD)" name="st-wa" value={form.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} />
                        </div>
                        <Input label="Instagram" name="st-ig" value={form.instagram} onChange={(e) => set({ instagram: e.target.value })} placeholder="minha.barbearia" />
                      </div>
                    </section>
                  ) : null}

                  {tab === "appearance" ? (
                    <section className="card">
                      <div className="card__head">
                        <h3>Logo, imagem e cor</h3>
                      </div>
                      <div className="form-stack">
                        <PhotoPicker name="st-logo" label="Logo" value={form.logo_url || null} onChange={(url) => set({ logo_url: url })} />
                        <PhotoPicker name="st-hero" label="Imagem principal" value={form.hero_image_url || null} onChange={(url) => set({ hero_image_url: url })} />
                        <div className="form-grid-2">
                          <Input label="Cor de destaque" type="color" name="st-color" value={form.primary_color} onChange={(e) => set({ primary_color: e.target.value })} />
                        </div>
                      </div>
                    </section>
                  ) : null}

                  {tab === "footer" ? (
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
                      </div>
                    </section>
                  ) : null}

                  {tab === "hours" ? (
                    <section className="card">
                      <div className="card__head">
                        <h3>Horário de funcionamento</h3>
                        <span className="muted">A disponibilidade considera o horário da barbearia E o do profissional.</span>
                      </div>
                      <HoursEditor rows={hours} onChange={setHours} />
                    </section>
                  ) : null}

                  <div className="page-actions">
                    <Button onClick={save} loading={saveBusy}>
                      Salvar alterações
                    </Button>
                  </div>
                </>
              ) : tab === "services" ? (
                <div className="settings-depth">
                  <button type="button" className="settings-back" onClick={() => setTab(null)}>
                    <Icon name="chevronLeft" size={16} />
                    Voltar
                  </button>
                  <ServicesPage />
                </div>
              ) : tab === "team" ? (
                <div className="settings-depth">
                  <button type="button" className="settings-back" onClick={() => setTab(null)}>
                    <Icon name="chevronLeft" size={16} />
                    Voltar
                  </button>
                  <TeamPage />
                </div>
              ) : tab === "coupons" ? (
                <div className="settings-depth">
                  <button type="button" className="settings-back" onClick={() => setTab(null)}>
                    <Icon name="chevronLeft" size={16} />
                    Voltar
                  </button>
                  <CouponsPage />
                </div>
              ) : tab === "blocks" ? (
                <div className="settings-depth">
                  <button type="button" className="settings-back" onClick={() => setTab(null)}>
                    <Icon name="chevronLeft" size={16} />
                    Voltar
                  </button>
                  <BlockedPage />
                </div>
              ) : tab === "profile" ? (
                <div className="settings-depth">
                  <button type="button" className="settings-back" onClick={() => setTab(null)}>
                    <Icon name="chevronLeft" size={16} />
                    Voltar
                  </button>
                  <ProfilePage />
                </div>
              ) : (
                <div className="settings-depth">
                  <button type="button" className="settings-back" onClick={() => setTab(null)}>
                    <Icon name="chevronLeft" size={16} />
                    Voltar
                  </button>
                  <GalleryPage />
                </div>
              )}
            </>
          ) : null}
        </section>
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