import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "radial-gradient(1200px 600px at 50% -10%, rgba(56,189,248,0.10), transparent), #0a0a0d",
      }}
    >
      <SignUp fallbackRedirectUrl="/dashboard" forceRedirectUrl="/dashboard" />
    </div>
  );
}
