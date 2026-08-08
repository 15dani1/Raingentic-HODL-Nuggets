/**
 * Thin route — renders the frontend Marketplace UI.
 * Owned by: frontend/UI team (page composition only; components live in
 * src/frontend).
 */
import { Marketplace } from "@/frontend/components/Marketplace";

export default function Home() {
  return <Marketplace />;
}
