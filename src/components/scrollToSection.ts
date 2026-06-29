// Smooth-scrolls to the element with the given id on the current page, landing
// its first article (if any) just below the fixed header. No-op when the id is
// not present on the page (e.g. when not on the homepage).
export function scrollToSection(id: string) {
  const section = document.getElementById(id);
  if (!section) return;
  // Land the first row's content just below the fixed header, rather than the
  // section wrapper (whose large top padding would otherwise leave a visible
  // gap under the header).
  const target = section.querySelector('article') ?? section;
  const header = document.querySelector('header');
  const headerOffset = header ? header.getBoundingClientRect().height : 84;
  const top = target.getBoundingClientRect().top + window.scrollY - headerOffset;
  window.scrollTo({ top, behavior: 'smooth' });
}
