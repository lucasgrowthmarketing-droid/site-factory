/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  MapPin,
  Menu,
  Phone,
  Scissors,
  Wrench,
  X,
  MessageCircle,
  Navigation,
  Plus,
  Minus,
} from "lucide-react";
import { isMapsUrl, type SiteConfig } from "@/lib/domain";
const barberServices = [
  [
    "Corte masculino",
    "Linhas, textura e personalidade. Um visual pensado para cada estilo.",
  ],
  [
    "Barba & acabamento",
    "Os detalhes que transformam o resultado. Cuidado do início ao fim.",
  ],
  [
    "Experiência completa",
    "Um momento para desacelerar e renovar a sua imagem.",
  ],
];
const mechanicServices = [
  [
    "Manutenção & revisão",
    "Cuidado preventivo para seguir em frente com mais tranquilidade.",
  ],
  [
    "Diagnóstico automotivo",
    "Entender o problema é o primeiro passo para a solução.",
  ],
  [
    "Freios & suspensão",
    "Atenção aos sistemas que fazem diferença em cada trajeto.",
  ],
];
function Photograph({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading={className === "site-hero-photo" ? "eager" : "lazy"}
      onError={(e) => {
        e.currentTarget.style.opacity = "0";
      }}
    />
  );
}
export default function BusinessSite({ config: c }: { config: SiteConfig }) {
  const auto = c.templateId === "mechanic-pro";
  const Icon = auto ? Wrench : Scissors;
  const hero =
    c.imageUrl && c.imageUrl !== "/barber.svg"
      ? c.imageUrl
      : `/templates/${auto ? "mechanic" : "barber"}-hero.webp`;
  const sheet = `/templates/${auto ? "mechanic" : "barber"}-services.webp`;
  const [menu, setMenu] = useState(false),
    [contact, setContact] = useState(false),
    [map, setMap] = useState(false),
    [faq, setFaq] = useState<number | null>(0),
    [photo, setPhoto] = useState<string | null>(null);
  useEffect(() => {
    if (!contact && !photo) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setContact(false);
        setPhoto(null);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [contact, photo]);
  const serviceData = c.services.length
    ? c.services.map((s) => [
        s,
        auto
          ? "Saiba mais sobre este serviço e as opções para seu veículo."
          : "Conheça as possibilidades para o seu próximo visual.",
      ])
    : auto
      ? mechanicServices
      : barberServices;
  const query = [c.businessName, c.address, c.city].filter(Boolean).join(", ");
  const mapsUrl =
    c.mapsUrl && isMapsUrl(c.mapsUrl)
      ? c.mapsUrl
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  const gallery = c.gallery?.length ? c.gallery : [];
  const faqs = [
    [
      auto ? "Como solicitar atendimento?" : "Como agendar meu horário?",
      `Na versão definitiva, o contato pode ser conectado ao WhatsApp ou ao sistema utilizado ${auto ? "pela oficina" : "pela barbearia"}. Aqui os botões estão em modo demonstrativo.`,
    ],
    [
      "Quais serviços estão disponíveis?",
      "Os serviços exibidos são uma proposta de apresentação. A lista deve ser confirmada com o estabelecimento antes da publicação definitiva.",
    ],
    [
      auto ? "Como encontrar a oficina?" : "Onde fica a barbearia?",
      "O endereço apresentado vem do cadastro do negócio. Quando ele estiver preenchido, você pode consultar a localização no Google Maps.",
    ],
  ];
  return (
    <div
      className={`business-site ${auto ? "auto-site" : "barber-site"} ${c.font}`}
      style={{ "--accent": c.color } as React.CSSProperties}
    >
      <div className="site-demo">
        <span>PRÉVIA INDEPENDENTE</span> Conceito de site para apresentação
        comercial. Não é o site oficial.
      </div>
      <header className="site-header">
        <a href="#inicio" className="site-identity">
          {c.logoUrl && c.logoAuthorized ? (
            <img
              className="site-logo"
              src={c.logoUrl}
              alt={`Logo autorizada de ${c.businessName}`}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <span className="site-monogram">
              <Icon size={27} />
            </span>
          )}
          <span>
            {c.businessName}
            <small>{auto ? "CENTRO AUTOMOTIVO" : "BARBEARIA & ESTILO"}</small>
          </span>
        </a>
        <nav
          className={menu ? "site-nav expanded" : "site-nav"}
          aria-label="Navegação da demonstração"
        >
          {[
            ["#sobre", auto ? "A oficina" : "Nossa essência"],
            ["#servicos", "Serviços"],
            ["#galeria", auto ? "Estrutura" : "O ambiente"],
            ["#localizacao", "Localização"],
          ].map(([href, title]) => (
            <a key={href} onClick={() => setMenu(false)} href={href}>
              {title}
            </a>
          ))}
        </nav>
        <button
          className="site-cta header-cta"
          onClick={() => setContact(true)}
        >
          {auto ? "Falar com a oficina" : "Agendar experiência"}
          <ArrowUpRight size={17} />
        </button>
        <button
          className="site-menu-toggle"
          aria-label={menu ? "Fechar navegação" : "Abrir navegação"}
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X /> : <Menu />}
        </button>
      </header>
      <section className="site-hero" id="inicio">
        <Photograph
          src={hero}
          alt={
            auto
              ? "Imagem ilustrativa de manutenção automotiva em oficina"
              : "Imagem ilustrativa de uma barbearia com cadeira de couro e espelhos"
          }
          className="site-hero-photo"
        />
        <div className="site-hero-shade" />
        <div className="site-hero-inner">
          <div className="site-overline">
            <span />
            {c.city
              ? `${auto ? "CUIDADO AUTOMOTIVO" : "ESTILO & TRADIÇÃO"} EM ${c.city.toUpperCase()}`
              : auto
                ? "PAIXÃO POR CUIDAR. PRECISÃO PARA RESOLVER."
                : "TRADIÇÃO NO CUIDADO. AUTENTICIDADE NO ESTILO."}
          </div>
          <h1>{c.headline}</h1>
          <p>{c.description}</p>
          <div className="site-hero-actions">
            <button className="site-cta" onClick={() => setContact(true)}>
              {auto
                ? "Vamos cuidar do seu carro"
                : "Seu próximo visual começa aqui"}
              <ArrowUpRight size={19} />
            </button>
            <a className="site-outline" href="#servicos">
              Conheça os serviços <ArrowRight size={17} />
            </a>
          </div>
          <div className="hero-location">
            <MapPin size={16} />
            {c.address || c.city || "Localização a confirmar"}
          </div>
        </div>
        <div className="site-hero-bottom">
          <span>
            01 — {auto ? "CUIDADO EM CADA DETALHE" : "FEITO PARA O SEU ESTILO"}
          </span>
          <a href="#sobre">
            Explore a experiência <ChevronDown size={15} />
          </a>
          <small>Fotografia ilustrativa</small>
        </div>
      </section>
      <div className="site-manifesto">
        {(auto
          ? ["DIAGNÓSTICO", "MANUTENÇÃO", "CUIDADO AUTOMOTIVO"]
          : ["CORTE", "BARBA", "IDENTIDADE"]
        ).map((text) => (
          <span key={text}>
            {text}
            <i>✦</i>
          </span>
        ))}
      </div>
      <section className="site-about site-section" id="sobre">
        <div className="about-visual">
          <Photograph
            src={gallery[0] || hero}
            alt="Apresentação do negócio; material ilustrativo quando não fornecido pela empresa"
          />
          <span className="visual-caption">
            {auto
              ? "CUIDAR DO SEU CARRO É CUIDAR DO SEU CAMINHO."
              : "O SEU ESTILO MERECE UM LUGAR À ALTURA."}
          </span>
          <div className="photo-corner">
            <Icon size={30} />
            <span>
              {auto ? "MECÂNICA COM PROPÓSITO" : "O CUIDADO TEM IDENTIDADE"}
            </span>
          </div>
        </div>
        <div className="about-copy">
          <p className="section-kicker">
            {auto ? "A OFICINA" : "NOSSA ESSÊNCIA"} <span>01</span>
          </p>
          <h2>
            {auto ? (
              <>
                Seu carro faz parte
                <br />
                da sua história.
                <br />
                <em>O cuidado também.</em>
              </>
            ) : (
              <>
                Não é só sobre
                <br />
                cabelo e barba.
                <br />
                <em>É sobre você.</em>
              </>
            )}
          </h2>
          <div className="section-rule" />
          <p>
            {c.about ||
              (auto
                ? `Na ${c.businessName}, este espaço apresenta uma proposta de cuidado para acompanhar você em cada trajeto. Um site pensado para mostrar os serviços e facilitar o primeiro contato com a oficina.`
                : `A ${c.businessName} ganha aqui um espaço para expressar sua identidade. Um conceito que une o ritual da barbearia à personalidade de quem escolhe cuidar do próprio estilo.`)}
          </p>
          {!c.about && (
            <small className="site-content-note">
              Apresentação demonstrativa. Texto personalizável com a história
              real do negócio.
            </small>
          )}
          <div className="about-signature">
            <Icon size={24} />
            <span>
              {c.businessName}
              <small>{c.city || "SUA CIDADE"}</small>
            </span>
          </div>
        </div>
      </section>
      <section className="site-services site-section" id="servicos">
        <div className="site-section-heading">
          <div>
            <p className="section-kicker">
              {auto
                ? "SOLUÇÕES PARA O SEU VEÍCULO"
                : "ESCOLHA O SEU PRÓXIMO ESTILO"}{" "}
              <span>02</span>
            </p>
            <h2>
              {auto ? (
                <>
                  Cada detalhe importa.
                  <br />
                  <em>Cada serviço também.</em>
                </>
              ) : (
                <>
                  O ritual começa aqui.
                  <br />
                  <em>O estilo fica com você.</em>
                </>
              )}
            </h2>
          </div>
          <div>
            <p>
              {auto
                ? "Uma apresentação clara do que a oficina pode oferecer."
                : "Um espaço para apresentar os cuidados que fazem parte da sua identidade."}
            </p>
            {!c.services.length && (
              <small className="service-example-label">
                Serviços ilustrativos · confirmar disponibilidade
              </small>
            )}
          </div>
        </div>
        <div className="site-service-grid">
          {serviceData.slice(0, 9).map(([name, description], i) => (
            <article key={i} className="site-service-card">
              <div className="service-photo">
                {gallery[i + 1] ? (
                  <Photograph src={gallery[i + 1]} alt={name} />
                ) : (
                  <div
                    className="sheet-photo"
                    role="img"
                    aria-label={`Fotografia ilustrativa de ${name}`}
                    style={{
                      backgroundImage: `url(${sheet})`,
                      backgroundPosition: `${(i % 3) * 50}% center`,
                    }}
                  />
                )}
                <span>0{i + 1}</span>
              </div>
              <div className="service-card-copy">
                <h3>{name}</h3>
                <p>{description}</p>
                <button onClick={() => setContact(true)}>
                  {auto ? "Consultar serviço" : "Conhecer cuidado"}{" "}
                  <ArrowUpRight size={17} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="site-process site-section">
        <p className="section-kicker">
          {auto
            ? "DO PRIMEIRO CONTATO À ENTREGA"
            : "DA CHEGADA AO ÚLTIMO DETALHE"}{" "}
          <span>03</span>
        </p>
        <h2>
          {auto ? (
            <>
              Um caminho simples.
              <br />
              <em>Para seguir em frente.</em>
            </>
          ) : (
            <>
              Seu tempo.
              <br />
              <em>Seu momento.</em>
            </>
          )}
        </h2>
        <div className="site-process-grid">
          {(auto
            ? [
                [
                  "Converse com a oficina",
                  "Apresente o que seu veículo precisa e tire suas dúvidas.",
                ],
                [
                  "Conheça as possibilidades",
                  "Solicite orientações sobre diagnóstico e manutenção.",
                ],
                [
                  "Combine o próximo passo",
                  "Consulte a disponibilidade e os detalhes do atendimento.",
                ],
              ]
            : [
                [
                  "Encontre seu estilo",
                  "Explore os cuidados e imagine seu próximo visual.",
                ],
                [
                  "Escolha o seu momento",
                  "Consulte os canais de atendimento e a disponibilidade.",
                ],
                [
                  "Cuide de você",
                  "Um conceito pensado para valorizar cada detalhe.",
                ],
              ]
          ).map(([title, copy], i) => (
            <div key={title}>
              <span>0{i + 1}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </div>
          ))}
        </div>
        <small className="site-content-note">
          Proposta de experiência demonstrativa. Detalhes do atendimento a
          confirmar.
        </small>
      </section>
      <section className="site-wide-cta">
        <Photograph src={hero} alt="Imagem ilustrativa do segmento" />
        <div>
          <p className="section-kicker">{c.businessName}</p>
          <h2>
            {auto ? (
              <>
                O próximo destino começa
                <br />
                com um carro bem cuidado.
              </>
            ) : (
              <>
                Estilo não se explica.
                <br />
                <em>Se vive.</em>
              </>
            )}
          </h2>
          <button className="site-cta" onClick={() => setContact(true)}>
            {auto ? "Fale sobre o seu veículo" : "Reserve um momento para você"}
            <ArrowUpRight size={19} />
          </button>
        </div>
      </section>
      <section className="site-gallery site-section" id="galeria">
        <div className="site-section-heading">
          <div>
            <p className="section-kicker">
              {auto ? "POR DENTRO DO CUIDADO" : "UM LUGAR PARA SE SENTIR BEM"}{" "}
              <span>04</span>
            </p>
            <h2>
              {auto ? (
                <>
                  Estrutura que inspira
                  <br />
                  <em>um novo caminho.</em>
                </>
              ) : (
                <>
                  Atmosfera. Detalhe.
                  <br />
                  <em>Personalidade.</em>
                </>
              )}
            </h2>
          </div>
          <p>
            {gallery.length
              ? "Galeria fornecida pelo operador."
              : "Inspiração visual para apresentar o potencial do negócio. Estas imagens são ilustrativas."}
          </p>
        </div>
        <div className="site-gallery-grid">
          {gallery.length ? (
            gallery.slice(0, 4).map((src, i) => (
              <button
                key={src + i}
                aria-label={`Ampliar fotografia ${i + 1}`}
                onClick={() => setPhoto(src)}
              >
                <Photograph
                  src={src}
                  alt={`Galeria de ${c.businessName}, fotografia ${i + 1}`}
                />
                <Plus size={22} />
              </button>
            ))
          ) : (
            <>
              <div className="gallery-main">
                <Photograph src={hero} alt="Ambiente ilustrativo do segmento" />
                <span>
                  {auto
                    ? "PRECISÃO EM MOVIMENTO"
                    : "A ESSÊNCIA ESTÁ NOS DETALHES"}
                </span>
              </div>
              <div className="gallery-side">
                <div
                  className="sheet-photo"
                  role="img"
                  aria-label="Detalhe ilustrativo do atendimento"
                  style={{
                    backgroundImage: `url(${sheet})`,
                    backgroundPosition: "50% center",
                  }}
                />
                <div className="gallery-quote">
                  <Icon size={38} />
                  <span>
                    {auto
                      ? "Mais cuidado.\nNovas possibilidades."
                      : "Tradição no ritual.\nIdentidade no resultado."}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
      <section className="site-faq site-section">
        <div>
          <p className="section-kicker">
            BOM SABER <span>05</span>
          </p>
          <h2>
            Vamos tirar
            <br />
            <em>suas dúvidas.</em>
          </h2>
          <button className="site-text-link" onClick={() => setContact(true)}>
            Fale com a gente <ArrowUpRight size={16} />
          </button>
        </div>
        <div className="faq-items">
          {faqs.map(([title, answer], i) => (
            <div key={title}>
              <button
                aria-expanded={faq === i}
                aria-controls={`site-faq-${i}`}
                onClick={() => setFaq(faq === i ? null : i)}
              >
                {title}
                {faq === i ? <Minus size={19} /> : <Plus size={19} />}
              </button>
              {faq === i && <p id={`site-faq-${i}`}>{answer}</p>}
            </div>
          ))}
        </div>
      </section>
      <section className="site-location site-section" id="localizacao">
        <div>
          <p className="section-kicker">
            O SEU PRÓXIMO PASSO <span>06</span>
          </p>
          <h2>
            {auto ? (
              <>
                Vamos colocar seu carro
                <br />
                <em>no caminho certo.</em>
              </>
            ) : (
              <>
                Um novo visual.
                <br />
                <em>O mesmo você.</em>
              </>
            )}
          </h2>
          <p className="location-business">{c.businessName}</p>
          <div className="location-detail">
            <MapPin size={21} />
            <span>
              {c.address || "Endereço ainda não informado"}
              {c.city && <small>{c.city}</small>}
            </span>
          </div>
          {c.phone && (
            <div className="location-detail">
              <Phone size={20} />
              <span>
                {c.phone}
                <small>Contato informado no cadastro</small>
              </span>
            </div>
          )}
          <button className="site-cta" onClick={() => setContact(true)}>
            {auto ? "Conversar com a oficina" : "Conhecer a barbearia"}
            <MessageCircle size={18} />
          </button>
        </div>
        <div className="site-map">
          {c.address ? (
            map ? (
              <iframe
                title={`Mapa de ${c.businessName}`}
                src={`https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <button className="map-activate" onClick={() => setMap(true)}>
                <MapPin size={42} />
                <strong>{c.city || c.businessName}</strong>
                <span>{c.address}</span>
                <b>
                  Carregar Google Maps <Navigation size={16} />
                </b>
              </button>
            )
          ) : (
            <div className="map-activate">
              <MapPin size={42} />
              <strong>{c.city || "Seu negócio no mapa"}</strong>
              <span>
                Adicione o endereço completo no editor para exibir o mapa.
              </span>
            </div>
          )}
          {(c.address || c.mapsUrl) && (
            <a
              className="map-external"
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
            >
              Abrir no Google Maps <ArrowUpRight size={15} />
            </a>
          )}
        </div>
      </section>
      <footer className="site-footer">
        <a className="site-identity" href="#inicio">
          <Icon size={26} />
          <span>
            {c.businessName}
            <small>
              {auto ? "CUIDADO AUTOMOTIVO" : "ESTILO COM IDENTIDADE"}
            </small>
          </span>
        </a>
        <div>
          <a href="#sobre">Sobre</a>
          <a href="#servicos">Serviços</a>
          <a href="#localizacao">Localização</a>
        </div>
        <p>
          Conceito independente criado com SiteFactory.
          <br />
          Imagens padrão e conteúdo não confirmado são demonstrativos.
        </p>
      </footer>
      <button
        className="site-floating"
        aria-label="Contato em modo demonstrativo"
        onClick={() => setContact(true)}
      >
        <MessageCircle size={25} />
        <span>{auto ? "Vamos conversar?" : "Seu próximo estilo"}</span>
      </button>
      {contact && (
        <div className="site-overlay" onClick={() => setContact(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Contato demonstrativo"
            className="site-contact-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              autoFocus
              className="site-dialog-close"
              aria-label="Fechar contato"
              onClick={() => setContact(false)}
            >
              <X size={22} />
            </button>
            <Icon size={38} />
            <p className="section-kicker">UMA PRÉVIA DAS POSSIBILIDADES</p>
            <h2>
              Imagine seu negócio
              <br />
              <em>com essa presença.</em>
            </h2>
            <p>
              Este é um site de demonstração para {c.businessName}. Os botões de
              contato não iniciam mensagens ou agendamentos.
            </p>
            <button className="site-cta" onClick={() => setContact(false)}>
              Continuar explorando <ArrowRight size={17} />
            </button>
          </div>
        </div>
      )}
      {photo && (
        <div
          className="site-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Fotografia ampliada"
          onClick={() => setPhoto(null)}
        >
          <button
            className="site-lightbox-close"
            aria-label="Fechar fotografia"
            onClick={() => setPhoto(null)}
          >
            <X />
          </button>
          <img
            className="site-lightbox-photo"
            src={photo}
            alt="Fotografia ampliada da galeria"
          />
        </div>
      )}
    </div>
  );
}
