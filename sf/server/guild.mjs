import { createGuildMembership, insideGuild } from '../guild.js';

export function guildStatusFor(p, now = Date.now) {
  const membership = createGuildMembership(p.profile.guild, now);
  if (p.profile.guild) p.profile.guild = { ...membership.state };
  return { ...membership.status(), peptides: p.inventory.meta.peptides };
}
export function guildAction(p, action, { geometry, now, dirty }) {
  const ray = (geometry.merchants || []).find((n) => n.id === 'guild-ray');
  if (
    !ray ||
    p.hp <= 0 ||
    p.respawnAllowed ||
    p.personalJailed ||
    Math.hypot(p.x - ray.x, p.z - ray.z) > 3 ||
    Math.abs(p.y - ray.base) > 2.5 ||
    ['rocket', 'hidden', 'climb', 'airship'].includes(p.mode)
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
export function guildMayEnter(p, geometry, x, y, z) {
  const site = geometry.places?.find((s) => s.id === 'freemasons-guild');
  return (
    p.profile.guild?.member === true ||
    !insideGuild(site, x, z) ||
    y > geometry.characterGround(x, z) + 3
  );
}
