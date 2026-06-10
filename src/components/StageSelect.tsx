"use client";

import { useRef } from "react";
import { updateDealStage } from "@/app/dashboard/ventas/actions";
import { STAGE_LABELS, STAGE_ORDER, type DealStage } from "@/lib/types";

// Selector de etapa que guarda automáticamente al cambiar.
export default function StageSelect({
  dealId,
  current,
}: {
  dealId: string;
  current: DealStage;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form action={updateDealStage} ref={formRef}>
      <input type="hidden" name="id" value={dealId} />
      <select
        name="stage"
        defaultValue={current}
        onChange={() => formRef.current?.requestSubmit()}
        className="input cursor-pointer py-1 text-xs"
      >
        {STAGE_ORDER.map((s) => (
          <option key={s} value={s} className="bg-zinc-900">
            {STAGE_LABELS[s]}
          </option>
        ))}
      </select>
    </form>
  );
}
