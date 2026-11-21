interface Analytics {
  (...args: unknown[]): void;
  q?: unknown[][];
  l?: number;
}
declare global {
  interface Window {
    GoogleAnalyticsObject?: string;
    ga?: Analytics;
  }
}
window.GoogleAnalyticsObject = 'ga';
const ga: Analytics =
  window.ga ||
  function (...args: unknown[]) {
    (ga.q ||= []).push(args);
  };
window.ga = ga;
ga.l = Date.now();
const script = document.createElement('script');
script.async = true;
script.src = '//www.google-analytics.com/analytics.js';
const first = document.getElementsByTagName('script')[0];
if (first?.parentNode) first.parentNode.insertBefore(script, first);
else document.head.append(script);
ga('create', 'UA-74324013-1', 'auto');
ga('send', 'pageview');
document.addEventListener('DOMContentLoaded', () => {
  const images = [
    'images/beach.jpg',
    'images/suit-recent.png',
    'images/green_headshot.png',
    'images/self.jpg',
    'images/twitter-img.jpg',
  ] satisfies [string, string, string, string, string];
  let currentIndex = 0;
  const profile = document.querySelector<HTMLImageElement>('.float-right img');
  if (profile) {
    profile.src = images[currentIndex];
    profile.addEventListener('click', () => {
      currentIndex = (currentIndex + 1) % images.length;
      profile.src = images[currentIndex];
    });
    profile.style.cursor = 'pointer';
  }
});
export {};
