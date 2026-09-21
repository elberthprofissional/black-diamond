import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { Icon } from "../../components/ui/Icon";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loading } from "../../components/ui/Loading";
import {
  ApiError,
  fetchPublicShop,
  listGallery,
  toErrorMessage,
} from "../../services/api";
import type { PublicShop } from "../../services/api";
import type { Barbershop, GalleryItem } from "../../types";
import { formatCurrency, buildWhatsappLink } from "../../utils/format";
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



export function HomePage() {
  const { slug } = useParams<{ slug: string }>();
  const activeSlug = slug ?? DEFAULT_SLUG;

  const [shop, setShop] = useState<PublicShop | null>(null);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setShop(null);
    setGallery([]);
    setError(null);
    fetchPublicShop(activeSlug)
      .then((data) => {
        setShop(data);
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
          <div className="bd-hero__bg" aria-hidden="true" />
          <div className="bd-wrap bd-hero__grid">
            <div className="bd-hero__text">
              <Eyebrow>Barbearia no Tupi · Belo Horizonte</Eyebrow>
              <h1 className="bd-hero__title">
                Black <span className="bd-hero__title-gold">Diamond</span>
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
            </div>
          </div>
        </section>

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

            {s.show_address && b.address ? (
              <div className="bd-hoursloc__col">
                <Eyebrow>Localização</Eyebrow>
                <h2 className="bd-title">Onde estamos localizados</h2>
                <address className="bd-address">{b.address}</address>
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

// Depoimentos em cards: grade no desktop, swipe no mobile.
function Testimonials() {
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollStep = () => {
    const el = trackRef.current;
    if (!el) return 380;
    const card = el.querySelector<HTMLElement>(".bd-quote");
    return card ? card.offsetWidth + 20 : 380;
  };
  const scrollPrev = () =>
    trackRef.current?.scrollBy({ left: -scrollStep(), behavior: "smooth" });
  const scrollNext = () =>
    trackRef.current?.scrollBy({ left: scrollStep(), behavior: "smooth" });
  const initials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <>
      <div className="bd-head">
        <div>
          <Eyebrow>Quem senta, volta</Eyebrow>
          <h2 className="bd-title">O que dizem nossos clientes</h2>
          <p className="bd-testi__sub">
            Avaliações reais de quem já faz parte da casa.
          </p>
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
            <span className="bd-quote__mark" aria-hidden="true">
              “
            </span>
            <span className="bd-quote__stars" aria-label="Avaliação 5 de 5">
              ★★★★★
            </span>
            <blockquote>{t.text}</blockquote>
            <figcaption className="bd-quote__name">
              <span className="bd-quote__avatar" aria-hidden="true">
                {initials(t.name)}
              </span>
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
  const year = new Date().getFullYear();
  return (
    <footer className="bd-footer">
      <div className="bd-wrap">
        <div className="bd-footer__top">
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
                <Icon name="phone" size={13} />
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
                <Icon name="camera" size={13} />
                Instagram
              </a>
            ) : null}
            {s.show_address && b.address ? (
              <a href="#local" className="bd-footer__link">
                <Icon name="pin" size={13} />
                Localização
              </a>
            ) : null}
          </nav>
        </div>

        <div className="bd-footer__mid">
          <span className="bd-footer__tagline">Cortes clássicos. Estilo atual.</span>
          <span className="bd-footer__credit">
            {s.show_credits ? s.credits_text || b.name : "BLACK DIAMOND"} · © {year}
          </span>
        </div>

        <div className="bd-footer__base">
          <p className="bd-footer__legal">
            {b.name} — o cuidado masculino elevado ao padrão de um clube de cavalheiros.
          </p>
          <Link to="/login" className="bd-footer__admin" title="Acesso restrito · Área do administrador">
            <Icon name="lock" size={12} />
            admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
