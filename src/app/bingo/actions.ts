"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { generateJoinCode } from "@/lib/join-code";

const clampDim = (n: number) => Math.max(3, Math.min(8, Math.round(n) || 5));

export async function createBoard(formData: FormData) {
  const { user, supabase } = await requireUser();

  const title = String(formData.get("title") ?? "").trim();
  const cols = clampDim(Number(formData.get("cols")));
  const rows = clampDim(Number(formData.get("rows")));
  if (!title) redirect("/bingo?error=title");

  const boardId = crypto.randomUUID();
  let created = false;
  for (let attempt = 0; attempt < 5 && !created; attempt++) {
    const { error } = await supabase.from("bingo_boards").insert({
      id: boardId,
      owner_id: user.id,
      title,
      cols,
      rows,
      cells: Array(cols * rows).fill(""),
      join_code: generateJoinCode(),
    });
    if (!error) created = true;
    else if (error.code !== "23505") throw error;
  }
  if (!created) throw new Error("Couldn't create the board, please try again.");

  revalidatePath("/bingo");
  redirect(`/bingo/${boardId}`);
}

function normalizeCode(raw: string): string {
  let value = raw.trim();
  const fromUrl = value.match(/[?&]code=([^&\s]+)/i);
  if (fromUrl) value = decodeURIComponent(fromUrl[1]);
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
}

export async function joinBoard(formData: FormData) {
  const { supabase } = await requireUser();
  const code = normalizeCode(String(formData.get("code") ?? ""));
  if (code.length < 5) redirect("/bingo?error=short");

  const { data, error } = await supabase.rpc("join_bingo_by_code", { code });
  if (error || !data) redirect("/bingo?error=invalid");

  revalidatePath("/bingo");
  redirect(`/bingo/${data}`);
}

// Owner-only: set the text of one square.
export async function updateCell(input: { boardId: string; index: number; text: string }) {
  const { user, supabase } = await requireUser();

  const { data: board } = await supabase
    .from("bingo_boards")
    .select("owner_id, cells")
    .eq("id", input.boardId)
    .maybeSingle();
  if (!board || board.owner_id !== user.id) throw new Error("Only the owner can edit this board.");

  const cells = [...(board.cells as string[])];
  cells[input.index] = input.text.trim().slice(0, 120);

  const { error } = await supabase.from("bingo_boards").update({ cells }).eq("id", input.boardId);
  if (error) throw error;
  revalidatePath(`/bingo/${input.boardId}`);
}

// Owner-only: resize the grid, preserving any text that still fits.
export async function resizeBoard(input: { boardId: string; cols: number; rows: number }) {
  const { user, supabase } = await requireUser();
  const cols = clampDim(input.cols);
  const rows = clampDim(input.rows);

  const { data: board } = await supabase
    .from("bingo_boards")
    .select("owner_id, cols, rows, cells")
    .eq("id", input.boardId)
    .maybeSingle();
  if (!board || board.owner_id !== user.id) throw new Error("Only the owner can edit this board.");

  const old = board.cells as string[];
  const next: string[] = Array(cols * rows).fill("");
  for (let r = 0; r < Math.min(rows, board.rows); r++) {
    for (let c = 0; c < Math.min(cols, board.cols); c++) {
      next[r * cols + c] = old[r * board.cols + c] ?? "";
    }
  }

  const { error } = await supabase.from("bingo_boards").update({ cols, rows, cells: next }).eq("id", input.boardId);
  if (error) throw error;

  // Everyone's marks array must match the new cell count; resetting is the
  // honest option since square positions have shifted.
  await supabase.from("bingo_cards").update({ marks: Array(cols * rows).fill(false) }).eq("board_id", input.boardId);

  revalidatePath(`/bingo/${input.boardId}`);
}

export async function toggleSquare(input: { boardId: string; index: number; marks: boolean[] }) {
  const { user, supabase } = await requireUser();
  const marks = [...input.marks];
  marks[input.index] = !marks[input.index];

  const { error } = await supabase
    .from("bingo_cards")
    .update({ marks })
    .eq("board_id", input.boardId)
    .eq("user_id", user.id);
  if (error) throw error;
  revalidatePath(`/bingo/${input.boardId}`);
}

export async function deleteBoard(input: { boardId: string; confirmTitle: string }) {
  const { user, supabase } = await requireUser();

  const { data: board } = await supabase
    .from("bingo_boards")
    .select("title, owner_id")
    .eq("id", input.boardId)
    .maybeSingle();
  if (!board || board.owner_id !== user.id) throw new Error("Only the owner can delete this board.");
  if (input.confirmTitle.trim() !== board.title) throw new Error("The typed name doesn't match.");

  const { error } = await supabase.from("bingo_boards").delete().eq("id", input.boardId);
  if (error) throw error;

  revalidatePath("/bingo");
  redirect("/bingo");
}
