/* eslint-disable @next/next/no-img-element */
"use client";
import { useId, useRef, useState } from "react";
import { ImagePlus, Upload, X } from "lucide-react";
import { uploadLogo } from "@/lib/logo";

export default function LogoUpload({
  value,
  owner,
  onChange,
  onBusyChange,
  candidates = [],
}: {
  value?: string;
  candidates?: string[];
  owner: string;
  onChange: (url: string, uploaded?: boolean) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const id = useId(),
    input = useRef<HTMLInputElement>(null),
    pending = useRef(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function send(file?: File) {
    if (!file || pending.current) return;
    pending.current = true;
    setBusy(true);
    onBusyChange(true);
    setError("");
    try {
      onChange(await uploadLogo(file, owner), true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível enviar a imagem.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
      onBusyChange(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <section className="logo-uploader" aria-labelledby={id} aria-busy={busy}>
      <div className="logo-upload-title">
        <strong id={id}>Logo da empresa</strong>
        <span>Arquivo, arrastar ou colar</span>
      </div>
      <div
        className="logo-dropzone"
        tabIndex={0}
        role="group"
        aria-label="Área para colar ou soltar a logo"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void send(e.dataTransfer.files[0]);
        }}
        onPaste={(e) => {
          const file = [...e.clipboardData.items]
            .find((i) => i.kind === "file")
            ?.getAsFile();
          if (file) {
            e.preventDefault();
            void send(file);
          }
        }}
      >
        {value ? (
          <img
            src={value}
            alt="Prévia da logo selecionada"
            width={64}
            height={64}
          />
        ) : (
          <span className="logo-placeholder">
            <ImagePlus size={28} />
          </span>
        )}
        <div>
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            <Upload size={15} />
            {busy ? "Enviando…" : value ? "Trocar logo" : "Enviar logo"}
          </button>
          <p>Arraste a imagem ou clique aqui e cole com Ctrl+V.</p>
          <small>PNG, JPG ou WebP · até 10 MB · ajuste automático</small>
        </div>
        {value && (
          <button
            type="button"
            className="icon-button"
            aria-label="Remover logo do cadastro"
            disabled={busy}
            onClick={() => onChange("")}
          >
            <X size={17} />
          </button>
        )}
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-label="Selecionar arquivo da logo"
          hidden
          onChange={(e) => void send(e.target.files?.[0])}
        />
      </div>
      {error && (
        <p className="logo-upload-error" role="alert">
          {error}
        </p>
      )}
      {candidates.length > 0 && (
        <details>
          <summary>Ver imagens encontradas na fonte</summary>
          <p className="hint">
            Estas imagens podem ser fotos da empresa. Escolha apenas se for a
            logo correta.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {candidates.map((url, i) => (
              <button
                type="button"
                className="secondary"
                disabled={busy}
                key={url}
                onClick={() => onChange(url, true)}
                aria-label={`Usar imagem ${i + 1} como logo`}
              >
                <img
                  src={url}
                  alt={`Imagem candidata ${i + 1}`}
                  width={56}
                  height={56}
                  style={{ objectFit: "contain" }}
                />
              </button>
            ))}
          </div>
        </details>
      )}
      <details>
        <summary>Já tenho o link da logo</summary>
        <label>
          URL da logo
          <input
            type="url"
            placeholder="https://…"
            disabled={busy}
            value={value?.startsWith("data:") ? "" : (value ?? "")}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
      </details>
      <small className="hint">
        Envie uma logo que você tem autorização para usar. Ela será pública na
        vitrine. Salve para aplicar.
      </small>
    </section>
  );
}
