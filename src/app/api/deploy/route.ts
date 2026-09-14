import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/dal";
import { triggerSiteDeploy } from "@/lib/github/deploy";

export async function POST(): Promise<NextResponse> {
  const { user } = await verifySession();

  // Awaited (not fired via after()) since the button needs to know whether
  // the deploy actually dispatched. triggerSiteDeploy already cancels any
  // queued/in-progress run before dispatching the new one.
  const dispatched = await triggerSiteDeploy(`manual deploy triggered by ${user.email}`);

  if (!dispatched) {
    return NextResponse.json(
      { error: "Deployment could not be started. Please try again shortly." },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true });
}
