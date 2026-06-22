import { NextResponse, type NextRequest } from "next/server";

import { signAttestation } from "@/lib/attestation";

/**
 * Mock "exchange back-office" signing endpoint.
 *
 * In production, an exchange would run this as part of their off-chain
 * infrastructure. For the demo we host it next to the frontend so the Customer
 * view can obtain the exchange's signature over its encrypted balance handle.
 *
 * The exchange private key MUST live server-side (env var), never in the bundle.
 */
export async function POST(req: NextRequest) {
  const privateKey = process.env.EXCHANGE_SIGNER_PRIVATE_KEY;
  if (!privateKey) {
    return NextResponse.json(
      { error: "EXCHANGE_SIGNER_PRIVATE_KEY not set on the server." },
      { status: 500 },
    );
  }

  let body: {
    epochId: string;
    customer: string;
    handle: string;
    deadline: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { epochId, customer, handle, deadline } = body;
  if (!epochId || !customer || !handle || !deadline) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }

  try {
    const signature = await signAttestation(
      privateKey,
      BigInt(epochId),
      customer,
      handle,
      BigInt(deadline),
    );
    return NextResponse.json({ signature });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Signing failed." },
      { status: 500 },
    );
  }
}
