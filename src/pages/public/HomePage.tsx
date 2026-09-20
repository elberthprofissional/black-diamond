import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { Icon } from "../../components/ui/Icon";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loading } from "../../components/ui/Loading";
import {
  ApiError,
  fetchPublicShop,
  listBusinessHours,
  listGallery,
  toErrorMessage,
} from "../../services/api";
import type { PublicShop } from "../../services/api";
import type { Barbershop, BusinessHour, GalleryItem } from "../../types";
import { formatCurrency, buildWhatsappLink } from "../../utils/format";
import { WEEKDAYS_FULL, WEEKDAYS_SHORT } from "../../utils/date";
import { readableInk } from "./BookingPage";

const DEFAULT_SLUG = "black-diamond";

const NAV_LINKS = [
  { label: "Início", href: "#inicio" },
  { label: "Serviços", href: "#servicos" },
  { label: "Galeria", href: "#galeria" },
  { label: "Sobre", href: "#sobre" },
  { label: "Localização", href: "#local" },
];

// Depoimentos reais coletados no dia a dia da barbearia.
const TESTIMONIALS: { name: string; text: string }[] = [
  {
    name: "Giovanna Cardoso",
    text: "Profissional agradável, super atencioso, trabalho impecável e corte perfeito. Super recomendo!",
  },
  {
    name: "Guilherme Henrique",
    text: "Ótimo profissional, lugar aconchegante e trabalho impecável!",
  },
  {
    name: "Matheus",
    text: "Tato é bom demais, o cara sabe cuidar de cabelo.",
  },
  {
    name: "YP Tattoo",
    text: "Barbearia super confortável, ambiente agradável, higiênico, profissional super qualificado e atencioso. Só sucesso!",
  },
  {
    name: "Helbert Henrique",
    text: "Profissional de outro nível, o melhor de BH! Recomendo de olhos fechados.",
  },
];

interface HourGroup {
  label: string;
  time: string;
  isClosed: boolean;
  isToday: boolean;
}

// Agrupa os dias consecutivos com o mesmo horário em faixas legíveis
// (ex.: "Segunda-feira a Sábado — 08:00 – 18:00", "Domingo — Fechado").
function summarizeHours(hours: BusinessHour[], todayWeekday: number): HourGroup[] {
  if (hours.length === 0) return [];
  const rowOf = (d: number) => hours.find((h) => h.weekday === d);
  const groups: HourGroup[] = [];
  let i = 0;
  while (i < 7) {
    const h = rowOf(i);
    if (!h) {
      i++;
      continue;
    }
    if (h.is_closed) {
      groups.push({ label: WEEKDAYS_FULL[i], time: "Fechado", isClosed: true, isToday: i === todayWeekday });
      i++;
      continue;
    }
    let j = i;
    while (j < 6 && rowOf(j + 1) && !rowOf(j + 1)!.is_closed) j++;
    const label = j === i ? WEEKDAYS_FULL[i] : `${WEEKDAYS_FULL[i]} a ${WEEKDAYS_FULL[j]}`;
    groups.push({
      label,
      time: `${h.open_time.slice(0, 5)} – ${h.close_time.slice(0, 5)}`,
      isClosed: false,
      isToday: todayWeekday >= i && todayWeekday <= j,
    });
    i = j + 1;
  }
  return groups;
}

// Resumo curto ("Seg-Sáb · 08:00–18:00") usado no hero e pixels de suporte.
function hoursShort(hours: BusinessHour[]): string | null {
  const open = hours.filter((h) => !h.is_closed);
  if (open.length === 0) return null;
  const first = Math.min(...open.map((o) => o.weekday));
  const last = Math.max(...open.map((o) => o.weekday));
  const label = first === last ? WEEKDAYS_SHORT[first] : `${WEEKDAYS_SHORT[first]}-${WEEKDAYS_SHORT[last]}`;
  const t = open.find((o) => o.weekday === first)!;
  return `${label} · ${t.open_time.slice(0, 5)}–${t.close_time.slice(0, 5)}`;
}

export function HomePage() {
  const { slug } = useParams<{ slug: string }>();
  const activeSlug = slug ?? DEFAULT_SLUG;

  const [shop, setShop] = useState<PublicShop | null>(null);
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setShop(null);
    setHours([]);
    setGallery([]);
    setError(null);
    fetchPublicShop(activeSlug)
      .then((data) => {
        setShop(data);
        listBusinessHours(data.barbershop.id)
          .then(setHours)
          .catch(() => {});
        listGallery(data.barbershop.id)
          .then(setGallery)
          .catch(() => {});
      })
      .catch((e) =>
        setError(toErrorMessage(e instanceof ApiError ? e : { message: e.message }))
      );
  }, [activeSlug]);

  if (error) {
    return (
      <div className="auth">
        <EmptyState
          icon="◆"
          title="Barbearia não encontrada"
          description="Não encontramos esta página. Verifique o link ou confira se a barbearia está ativa."
        />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="auth">
        <Loading label="Carregando..." />
      </div>
    );
  }

  const b = shop.barbershop;
  const s = b.settings;
  const todayWeekday = new Date().getDay();
  const hourGroups = summarizeHours(hours, todayWeekday);
  const shortHours = hoursShort(hours);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${b.name} ${b.address}`
  )}`;
  const instagramUrl = b.instagram
    ? `https://instagram.com/${b.instagram.replace("@", "")}`
    : null;

  return (
    <div
      className="landing"
      style={{ "--accent": b.primary_color, "--accent-ink": readableInk(b.primary_color) } as CSSProperties}
    >
      <SiteHeader slug={activeSlug} shop={b} />

      <main>
        <section id="inicio" className="bd-hero">
          <div className="bd-wrap bd-hero__grid">
            <div className="bd-hero__text">
              <Eyebrow>Barbearia no Tupi · Belo Horizonte</Eyebrow>
              <h1 className="bd-hero__title">
                Não é apenas um corte.
                <br />
                <span className="bd-hero__title-gold">É um ritual.</span>
              </h1>
              <p className="bd-hero__lead">
                O cuidado masculino elevado ao padrão de um clube de cavalheiros — Black Diamond.
              </p>
              <div className="bd-hero__cta">
                <Link to={`/agendar/${activeSlug}`} className="btn-bd btn-bd--gold">
                  Agendar horário
                  <Icon name="arrowRight" size={16} />
                </Link>
                {s.show_whatsapp && b.whatsapp ? (
                  <a
                    href={buildWhatsappLink(b.whatsapp, "Olá, vim pelo site e quero mais informações.")}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-bd btn-bd--line"
                  >
                    <Icon name="phone" size={16} />
                    WhatsApp
                  </a>
                ) : null}
              </div>
              {shortHours ? (
                <p className="bd-hero__meta">
                  <span className="bd-mark">◆</span>
                  Atendimento {shortHours}
                </p>
              ) : null}
            </div>

            <div className="bd-hero__photo">
              <img src="/fundo-desktop.webp" alt="Interior da barbearia BLACK DIAMOND" className="bd-hero__photo-img" />
              <span className="bd-hero__photo-tag">Tupi · Belo Horizonte</span>
            </div>
          </div>
        </section>

        {/* Faixa de identidade */}
        <aside className="bd-strip" aria-hidden="true">
          <div className="bd-wrap bd-strip__inner">
            <span className="bd-strip__cell">Tupi • Belo Horizonte</span>
            <span className="bd-strip__divider" />
            <span className="bd-strip__cell bd-strip__cell--gold">◆</span>
            <span className="bd-strip__divider" />
            <span className="bd-strip__cell">Corte • Barba • Acabamento</span>
          </div>
        </aside>

        {shop.services.length > 0 ? (
          <section id="servicos" className="bd-section">
            <div className="bd-wrap bd-services">
              <div className="bd-services__aside">
                <Eyebrow>O menu</Eyebrow>
                <h2 className="bd-title">Cortes e serviços</h2>
                <p className="bd-services__note">
                  Serviço certo, feito no tempo certo. Escolha o seu.
                </p>
              </div>

              <div className="bd-services__body">
                <ul className="bd-menu">
                  {shop.services.map((svc) => (
                    <li key={svc.id} className="bd-menu__row">
                      <h3 className="bd-menu__name">{svc.name}</h3>
                      <span className="bd-menu__price">{formatCurrency(svc.price)}</span>
                    </li>
                  ))}
                </ul>

                <div className="bd-menu__cta">
                  <Link to={`/agendar/${activeSlug}`} className="bd-textcta">
                    Agendar horário
                    <Icon name="arrowRight" size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section id="galeria" className="bd-section bd-section--tint">
            <div className="bd-wrap">
              <div className="bd-head">
                <div>
                  <Eyebrow>O trabalho</Eyebrow>
                  <h2 className="bd-title">Feito na Black Diamond</h2>
                </div>
                <p className="bd-head__note">Um pouco do que sai da nossa cadeira.</p>
              </div>

              <div className="bd-gallery">
                {gallery.length > 0 ? (
                  gallery.map((g) => (
                    <figure key={g.id} className="bd-gallery__item">
                      {g.image_url ? (
                        <img src={g.image_url} alt={g.caption ?? "Corte" } loading="lazy" />
                      ) : (
                        <span className="bd-gallery__placeholder">
                          <span className="bd-mark">◆</span>
                          <span>Em breve</span>
                        </span>
                      )}
                      {g.image_url && g.caption ? <figcaption className="bd-gallery__cap">{g.caption}</figcaption> : null}
                    </figure>
                  ))
                ) : (
                  [0, 1, 2, 3, 4, 5].map((i) => (
                    <figure key={`ph-${i}`} className="bd-gallery__item">
                      <span className="bd-gallery__placeholder">
                        <span className="bd-mark">◆</span>
                        <span>Em breve</span>
                      </span>
                    </figure>
                  ))
                )}
              </div>

              {instagramUrl ? (
                <div className="bd-gallery__cta">
                  <a href={instagramUrl} target="_blank" rel="noreferrer" className="bd-textcta">
                    Ver mais cortes
                    <Icon name="arrowUpRight" size={16} />
                  </a>
                </div>
              ) : null}
            </div>
          </section>

        <section id="sobre" className="bd-section">
          <div className="bd-wrap bd-experience">
            <figure className="bd-experience__photo">
              <img src="/fundo-mobile.webp" alt="Um dia de trabalho na BLACK DIAMOND" loading="lazy" />
            </figure>
            <div className="bd-experience__text">
              <Eyebrow>A experiência</Eyebrow>
              <h2 className="bd-title">Não é só cortar o cabelo.</h2>
              <p className="bd-experience__lead">
                É sentar, relaxar e sair daqui sabendo que o corte ficou certo.
              </p>
              {b.about ? <p className="bd-experience__about">{b.about}</p> : null}
            </div>
          </div>
        </section>

        <section className="bd-section bd-section--tint">
          <div className="bd-wrap">
            <Testimonials />
          </div>
        </section>

        <section id="local" className="bd-section bd-hoursloc">
          <div className="bd-wrap bd-hoursloc__grid">
            {hourGroups.length > 0 ? (
              <div className="bd-hoursloc__col">
                <Eyebrow>Horário</Eyebrow>
                <h2 className="bd-title">Quando a gente atende.</h2>
                <ul className="bd-hours">
                  {hourGroups.map((g) => (
                    <li key={g.label} className={`bd-hours__row${g.isToday ? " is-today" : ""}`}>
                      <span className="bd-hours__day">
                        {g.label}
                        {g.isToday ? <em>hoje</em> : null}
                      </span>
                      <span className={`bd-hours__value${g.isClosed ? " is-closed" : ""}`}>
                        {g.time}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {s.show_address && b.address ? (
              <div className="bd-hoursloc__col">
                <Eyebrow>Onde estamos</Eyebrow>
                <h2 className="bd-title">O endereço da casa.</h2>
                <address className="bd-address">{b.address}</address>
                {b.phone ? (
                  <a className="bd-address__phone" href={`tel:${b.phone.replace(/\D/g, "")}`}>
                    {b.phone}
                  </a>
                ) : null}
                <div className="bd-map">
                  <iframe
                    title={`Mapa — ${b.name}`}
                    src={`https://www.google.com/maps?q=${encodeURIComponent(
                      `${b.name} ${b.address}`
                    )}&output=embed`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <a href={mapsUrl} target="_blank" rel="noreferrer" className="bd-textcta">
                  Abrir no Google Maps
                  <Icon name="arrowUpRight" size={16} />
                </a>
              </div>
            ) : null}
          </div>
        </section>
      </main>

      <SiteFooter b={b} s={s} />
    </div>
  );
}

// ---------------------------------------------------------------------
// Páginas internas.

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="bd-eyebrow">{children}</p>;
}

// Depoimentos em cards navegáveis: swipe no mobile, setas no desktop.
function Testimonials() {
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollStep = () => {
    const el = trackRef.current;
    if (!el) return 360;
    const card = el.querySelector<HTMLElement>(".bd-quote");
    return card ? card.offsetWidth + 16 : 360;
  };
  const scrollPrev = () =>
    trackRef.current?.scrollBy({ left: -scrollStep(), behavior: "smooth" });
  const scrollNext = () =>
    trackRef.current?.scrollBy({ left: scrollStep(), behavior: "smooth" });
  return (
    <>
      <div className="bd-head">
        <div>
          <Eyebrow>Quem senta, volta</Eyebrow>
          <h2 className="bd-title">O que dizem nossos clientes</h2>
        </div>
        <div className="bd-carousel__nav" aria-hidden="false">
          <button
            type="button"
            className="bd-carousel__btn"
            onClick={scrollPrev}
            aria-label="Depoimentos anteriores"
          >
            <Icon name="chevronLeft" size={18} />
          </button>
          <button
            type="button"
            className="bd-carousel__btn"
            onClick={scrollNext}
            aria-label="Próximos depoimentos"
          >
            <Icon name="chevronRight" size={18} />
          </button>
        </div>
      </div>

      <div className="bd-quotes" ref={trackRef}>
        {TESTIMONIALS.map((t) => (
          <figure key={t.name} className="bd-quote">
            <blockquote>
              <span className="bd-quote__mark">“</span>
              {t.text}
            </blockquote>
            <figcaption className="bd-quote__name">
              <span className="bd-mark">◆</span>
              {t.name}
            </figcaption>
          </figure>
        ))}
      </div>
    </>
  );
}

function SiteHeader({ slug, shop }: { slug: string; shop: Barbershop }) {
  const [open, setOpen] = useState(false);
  const brandNode = shop.logo_url ? (
    <img src={shop.logo_url} alt={shop.name} className="bd-brand__logo" />
  ) : (
    <span className="bd-brand__mark">◆</span>
  );
  return (
    <header className="bd-header">
      <div className="bd-wrap bd-header__bar">
        <Link to={`/${slug}`} className="bd-brand" onClick={() => setOpen(false)}>
          {brandNode}
          <span className="bd-brand__name">{shop.name}</span>
        </Link>

        <nav className={`bd-header__nav${open ? " is-open" : ""}`} aria-label="Navegação">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="bd-header__link" onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
          <Link to="/login" className="bd-header__link bd-header__link--muted" onClick={() => setOpen(false)}>
            Painel
          </Link>
          <Link
            to={`/agendar/${slug}`}
            className="btn-bd btn-bd--gold bd-header__cta"
            onClick={() => setOpen(false)}
          >
            Agendar horário
          </Link>
        </nav>

        <button
          type="button"
          className="bd-header__toggle"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name={open ? "x" : "menu"} size={20} />
        </button>
      </div>
    </header>
  );
}

function SiteFooter({
  b,
  s,
}: {
  b: { name: string; address: string | null; whatsapp: string | null; instagram: string | null };
  s: {
    show_address: boolean;
    show_instagram: boolean;
    show_whatsapp: boolean;
    show_credits: boolean;
    credits_text: string;
    barberflow_branding: boolean;
  };
}) {
  return (
    <footer className="bd-footer">
      <div className="bd-wrap bd-footer__bar">
        <span className="bd-brand">
          <span className="bd-brand__mark">◆</span>
          <span className="bd-brand__name">{b.name}</span>
        </span>
        <nav className="bd-footer__nav" aria-label="Links">
          {s.show_whatsapp && b.whatsapp ? (
            <a
              href={buildWhatsappLink(b.whatsapp, "Olá!")}
              target="_blank"
              rel="noreferrer"
              className="bd-footer__link"
            >
              WhatsApp
            </a>
          ) : null}
          {s.show_instagram && b.instagram ? (
            <a
              href={`https://instagram.com/${b.instagram.replace("@", "")}`}
              target="_blank"
              rel="noreferrer"
              className="bd-footer__link"
            >
              Instagram
            </a>
          ) : null}
          {s.show_address && b.address ? (
            <a href="#local" className="bd-footer__link">
              Localização
            </a>
          ) : null}
        </nav>
      </div>
      <div className="bd-wrap bd-footer__meta">
        <span className="bd-footer__tagline">Cortes clássicos. Estilo atual.</span>
        {s.show_credits ? (
          <span className="bd-footer__credit">
            {s.credits_text || b.name} · © {new Date().getFullYear()}
          </span>
        ) : (
          <span className="bd-footer__credit">© {new Date().getFullYear()} BLACK DIAMOND</span>
        )}
      </div>
    </footer>
  );
}