import React from "react";
import { ChevronRight } from "lucide-react";

export const LEVELS = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
];
export const LEVEL_LABEL = Object.fromEntries(LEVELS.map((level) => [level.value, level.label]));
export const STATUS = [
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Published" },
];
export const TYPES = [
  { value: "TEXT", label: "Text" },
  { value: "VIDEO", label: "Video link" },
  { value: "FILE", label: "File" },
];
export const PAGE_SIZE = 10;

export const money = (value) =>
  Number(value || 0) === 0 ? "Miễn phí" : `${Number(value).toLocaleString("vi-VN")} ₫`;

export const day = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
};

export function errorsOf(error) {
  return error?.fields && Object.keys(error.fields).length ? error.fields : null;
}

export function Field({ label, error, hint, children, required }) {
  return (
    <div className={`field${error ? " has-error" : ""}`}>
      {label && <label>{label} {required && <em>*</em>}</label>}
      {children}
      {error ? <span className="field-err">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export function Crumb({ items }) {
  return (
    <div className="crumbs">
      {items.map((item, index) => (
        <React.Fragment key={`${item.label}-${index}`}>
          {index > 0 && <ChevronRight size={14} />}
          {item.onClick ? (
            <button type="button" onClick={item.onClick}>{item.label}</button>
          ) : <strong>{item.label}</strong>}
        </React.Fragment>
      ))}
    </div>
  );
}
