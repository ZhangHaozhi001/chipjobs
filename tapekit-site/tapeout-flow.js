/**
 * Tape-out flow seam (M2 reservation).
 *
 * Producing a circuit happens on tapeout.net: the designer draws (or imports)
 * a circuit on an existing processor in a canvas, connects THEIR wallet and
 * signs the tape-out; the circuit NFT (#ID) is minted to their address. There
 * is no CLI/API for this (validation report §2), and it must never be done
 * with anyone else's keys — so ChipJobs treats it as an external user step:
 *
 *   1. Designer clicks "Tape out on tapeout.net" (link below).
 *   2. In the canvas they pick the bounty's processor, build the circuit,
 *      sign with their wallet, and note (processor index, circuit #ID).
 *   3. Back in ChipJobs they paste the two numbers into the claim form;
 *      submitAndClaim() then verifies ownership on-chain.
 *
 * This module is the single place that knows the tapeout.net entry points, so
 * if TapeOut ever ships a deep-link or embed API, only this file changes.
 */

export const TAPEOUT_CANVAS_URL = 'https://tapeout.net/';

/** Entry link for a bounty: tapeout.net, plus the context the user needs. */
export function tapeoutEntryFor(bounty) {
  return {
    url: TAPEOUT_CANVAS_URL,
    processorIndex: bounty.anyCpu ? null : bounty.cpuIndex, // null = any processor allowed
    instructions: [
      'Open tapeout.net and connect the wallet that will claim the bounty.',
      bounty.anyCpu
        ? 'This bounty allows any processor — pick one you know well.'
        : `Open processor #${bounty.cpuIndex} (the bounty requires this processor).`,
      'Draw or import your circuit, run the canvas checks, then sign the tape-out.',
      'Note the circuit #ID that was minted to your address.',
      'Return here and submit (processor index, circuit #ID) in the claim form.',
    ],
  };
}

/** Validate the two numbers a designer pastes back before enabling claim. */
export function parseClaimInput(cpuText, idText) {
  const cpu = Number(cpuText);
  const circuitId = Number(idText);
  if (!Number.isInteger(cpu) || cpu < 0) return { ok: false, error: 'processor index must be a non-negative integer' };
  if (!Number.isInteger(circuitId) || circuitId < 1) return { ok: false, error: 'circuit #ID starts at 1' };
  return { ok: true, cpuIndex: cpu, circuitId };
}
