/* eslint-disable @next/next/no-img-element */
"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  Scissors,
  MapPin,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import type { SiteConfig } from "@/lib/domain";
export default function Barber({ config: c }: { config: SiteConfig }) {
  const [message, setMessage] = useState(false);
  return (
    <div
      className={`barber ${c.font}`}
      style={{ "--gold": c.color } as React.CSSProperties}
    >
      <div className="demo-banner">
        <span>CONCEITO INDEPENDENTE</span> Demonstração comercial. Este não é o
        site oficial da empresa.
      </div>
      <nav className="barber-nav">
        <a href="#inicio" className="barber-brand">
          <Scissors size={25} />
          {c.businessName}
        </a>
        <div>
          <a href="#sobre">A essência</a>
          <a href="#servicos">Serviços</a>
          <a href="#local">Localização</a>
        </div>
        <button onClick={() => setMessage(true)}>
          Fale conosco <ArrowUpRight size={16} />
        </button>
      </nav>
      <section className="barber-hero" id="inicio">
        <img
          src={c.imageUrl || "/barber.svg"}
          alt="Ambientação ilustrativa de uma barbearia; não representa o estabelecimento"
        />
        <div className="barber-hero-content">
          <p className="eyebrow">
            CUIDADO NOS DETALHES. IDENTIDADE EM CADA CORTE.
          </p>
          <h1>{c.headline}</h1>
          <p>{c.description}</p>
          <button onClick={() => setMessage(true)}>
            Conheça sua próxima versão <ArrowUpRight size={20} />
          </button>
          <small>Conceito de apresentação • Imagem ilustrativa</small>
        </div>
        <div className="hero-foot">
          <span>
            TRADIÇÃO NO CUIDADO.
            <br />
            PERSONALIDADE NO ESTILO.
          </span>
          <a href="#sobre">Explore a experiência ↓</a>
        </div>
      </section>
      <section className="barber-about" id="sobre">
        <span className="eyebrow">01 / A ESSÊNCIA</span>
        <div>
          <h2>
            Mais do que um corte.
            <br />
            <em>Uma expressão de quem você é.</em>
          </h2>
          <p>
            Uma presença digital à altura do seu negócio. Este espaço pode
            apresentar a história, a equipe e os diferenciais reais de{" "}
            {c.businessName}.
          </p>
          <span className="illustrative">
            Texto demonstrativo — personalize com informações confirmadas.
          </span>
        </div>
      </section>
      <section className="barber-services" id="servicos">
        <div className="section-top">
          <div>
            <p className="eyebrow">02 / O CUIDADO</p>
            <h2>Seu estilo, em primeiro lugar.</h2>
          </div>
          <Scissors size={35} />
        </div>
        <div className="service-grid">
          {(c.services.length
            ? c.services
            : ["Corte", "Barba", "Cuidado completo"]
          ).map((s, i) => (
            <div key={i}>
              <span>0{i + 1}</span>
              <h3>{s}</h3>
              <ArrowUpRight size={24} />
              <p>
                {c.services.length
                  ? "Entre em contato para saber mais."
                  : "Sugestão ilustrativa. Serviço a confirmar com o estabelecimento."}
              </p>
            </div>
          ))}
        </div>
      </section>
      <section className="barber-detail">
        <Sparkles size={30} />
        <h2>
          O detalhe faz
          <br />
          <em>toda a diferença.</em>
        </h2>
        <p>Espaço para os diferenciais confirmados do estabelecimento.</p>
      </section>
      <section className="barber-gallery">
        <p className="eyebrow">03 / INSPIRAÇÃO VISUAL</p>
        <h2>Uma atmosfera que inspira.</h2>
        <div>
          <img
            src="/barber.svg"
            alt="Ilustração conceitual de interior de barbearia"
          />
          <div>
            <Scissors size={70} />
            <span>
              UM CONCEITO.
              <br />
              INFINITAS POSSIBILIDADES.
            </span>
          </div>
        </div>
        <small>
          Galeria conceitual ilustrada. Não são fotos reais do estabelecimento.
        </small>
      </section>
      <section className="barber-location" id="local">
        <div>
          <p className="eyebrow">04 / ENCONTRE SEU ESTILO</p>
          <h2>
            O próximo capítulo
            <br />
            começa com você.
          </h2>
          <p>
            <MapPin size={18} />
            {c.address || c.city || "Localização a confirmar"}
          </p>
          {c.address && c.city && <p>{c.city}</p>}
          {c.phone && <p>Contato informado: {c.phone}</p>}
          <button onClick={() => setMessage(true)}>
            Vamos conversar <ArrowRight size={18} />
          </button>
        </div>
        <div className="map-concept">
          <MapPin size={42} />
          <span>{c.city || "Sua cidade"}</span>
          <small>Localização ilustrativa · mapa não interativo</small>
        </div>
      </section>
      <footer className="barber-footer">
        <span>
          <Scissors size={20} />
          {c.businessName}
        </span>
        <small>
          Demonstração independente por SiteFactory. Sem vínculo ou autorização
          presumida.
        </small>
      </footer>
      {message && (
        <div className="modal-backdrop" onClick={() => setMessage(false)}>
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Contato demonstrativo"
            onClick={(e) => e.stopPropagation()}
          >
            <Scissors />
            <h2>Uma prévia das possibilidades.</h2>
            <p>
              Este botão está em modo demonstrativo. Nenhuma mensagem ou ligação
              foi iniciada.
            </p>
            <button onClick={() => setMessage(false)}>
              Continuar explorando
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
