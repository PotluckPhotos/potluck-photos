import { redeemInviteCode } from "@/app/invite/actions";
import { card, input, primaryButton } from "@/lib/ui";

export default function InviteGate({ redirectTo, error }: { redirectTo: string; error?: boolean }) {
  return (
    <div style={{ ...card, maxWidth: 420, margin: "24px 0" }}>
      <h3 style={{ margin: "0 0 4px", fontFamily: "var(--font-head)", fontSize: 17 }}>Invite only, for now</h3>
      <p style={{ margin: "0 0 14px", fontSize: 13.5, color: "var(--text-secondary)" }}>
        Potluck is limited to invited people right now. Enter your invite code to unlock creating and joining.
      </p>
      {error && <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--text-danger)" }}>That code didn&apos;t work.</p>}
      <form action={redeemInviteCode} style={{ display: "flex", gap: 8 }}>
        <input type="hidden" name="redirect" value={redirectTo} />
        <input name="code" placeholder="INVITE CODE" required style={{ ...input, flex: 1, letterSpacing: 2, textTransform: "uppercase" }} />
        <button type="submit" style={primaryButton}>Unlock</button>
      </form>
    </div>
  );
}
