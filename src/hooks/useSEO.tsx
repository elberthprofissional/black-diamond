import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
}

const SITE_NAME = 'Black Diamond Barbearia';
const DEFAULT_DESCRIPTION =
  'Agende seu horário na Black Diamond Barbearia. Cortes, barba e serviços premium.';
const DEFAULT_OG_IMAGE = `${import.meta.env.VITE_SITE_URL || 'https://black-diamond.vercel.app'}/assets/logo.webp`;

export function useSEO({
  title,
  description = DEFAULT_DESCRIPTION,
  ogTitle,
  ogDescription,
  ogImage = DEFAULT_OG_IMAGE,
  ogUrl,
}: SEOProps) {
  const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;
  const finalOgTitle = ogTitle || fullTitle;
  const finalOgDescription = ogDescription || description;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={finalOgTitle} />
      <meta property="og:description" content={finalOgDescription} />
      <meta property="og:image" content={ogImage} />
      {ogUrl && <meta property="og:url" content={ogUrl} />}
      <meta name="twitter:title" content={finalOgTitle} />
      <meta name="twitter:description" content={finalOgDescription} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
