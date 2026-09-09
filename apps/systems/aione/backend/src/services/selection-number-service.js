function pad(value, width) {
  return String(value).padStart(width, "0");
}

function normalizeDate(value) {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) {
    const error = new Error("Invalid selection date.");
    error.code = "invalid_selection_date";
    error.statusCode = 400;
    throw error;
  }
  return date.toISOString().slice(0, 10);
}

export async function allocateSelectionNo(client, selectionDateValue) {
  const selectionDate = normalizeDate(selectionDateValue);
  const counter = await client.query(
    `INSERT INTO public.selection_number_counters(selection_date, last_number, updated_at)
     VALUES ($1::date, 1, NOW())
     ON CONFLICT (selection_date) DO UPDATE
       SET last_number = public.selection_number_counters.last_number + 1,
           updated_at = NOW()
     RETURNING last_number`,
    [selectionDate]
  );

  const number = Number(counter.rows[0].last_number);
  if (!Number.isInteger(number) || number < 1 || number > 999) {
    const error = new Error(`Daily selection number capacity exceeded for ${selectionDate}.`);
    error.code = "selection_number_capacity_exceeded";
    error.statusCode = 409;
    throw error;
  }

  const compactDate = selectionDate.slice(2).replaceAll("-", "");
  return {
    selectionNo: `xp${compactDate}${pad(number, 3)}`,
    selectionDate
  };
}
