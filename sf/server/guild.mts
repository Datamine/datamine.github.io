import '../types/assert.ts';
import type { SimulationServices, ServerPlayer, ServerGeometry } from '../types/server.ts';
import { createGuildMembership, insideGuild } from '../guild.ts';

export function guildStatusFor(p: ServerPlayer, now = Date.now) {
  const membership = createGuildMembership(p.profile.guild, now);
  if (p.profile.guild) p.profile.guild = { ...membership.state };
  return { ...membership.status(), peptides: p.inventory.meta.peptides };
}
export function guildAction(
  p: ServerPlayer,
  action: string,
  { geometry, now, dirty }: Pick<SimulationServices, 'geometry' | 'now' | 'dirty'>,
) {
  const ray = (geometry.merchants || []).find((n) => n.id === 'guild-ray');
  if (
    !ray ||
    p.hp <= 0 ||
    p.respawnAllowed ||
    p.personalJailed ||
    Math.hypot(p.x - ray.x, p.z - ray.z) > 3 ||
    Math.abs(p.y - Number(ray.base)) > 2.5 ||
    (['rocket', 'hidden', 'climb', 'airship'] satisfies [string, string, string, string]).includes(
      p.mode,
    )
  )
    return { ok: false, message: 'Speak to Ray at the Freemasons’ Guild first.' };
  const membership = createGuildMembership(p.profile.guild, now, (saved) => {
    p.profile.guild = saved;
    dirty(p);
  });
  const result =
    action === 'guildDonate'
      ? membership.donate(() => {
          if (!p.inventory.meta.peptides) return false;
          p.inventory.meta.peptides--;
          p.inventory.save();
          return true;
        })
      : membership.checkIn();
  return { ...result, guild: guildStatusFor(p, now), inventory: p.inventory.snapshot() };
}
export function guildMayEnter(
  p: Pick<ServerPlayer, 'profile'>,
  geometry: ServerGeometry,
  x: number,
  y: number,
  z: number,
) {
  const site = geometry.places?.find((s) => s.id === 'freemasons-guild');
  return (
    p.profile.guild?.member === true ||
    !insideGuild(site, x, z) ||
    y > geometry.characterGround(x, z) + 3
  );
}
