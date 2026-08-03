"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { generateJoinCode } from "@/lib/join-code";

export async function createBoard(formData: FormData) {
  const { user, supabase } = await requireUser();

  const title = String(formData.get("title") ?? "").trim();
  const phrases = String(formData.get("phrases") ?? "")
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);

  if (!title) redirect("/bingo?error=title");
  if (phrases.length < 24) redirect("/bingo?error=count");

  const boardId = crypto.randomUUID();
  let created = false;
  for (let attempt = 0; attempt < 5 && !created; attempt++) {
    const { error } = await supabase.from("bingo_boards").insert({
      id: boardId,
      owner_id: user.id,
      title,
      phrases,
      join_code: generateJoinCode(),
    });
    if (!error) created = true;
    else if (error.code !== "23505") throw error; // unique violation on join_code
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
