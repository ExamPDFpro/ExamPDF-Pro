export type PageItem = { id: string; label: string; group: 'quick' | 'support' | 'legal'; content: string; url: string; show: boolean };
export const DEFAULT_PAGES: PageItem[] = [
  { id: 'about', label: 'About Us', group: 'quick', content: '', url: '', show: true },
  { id: 'help', label: 'Help Center', group: 'support', content: '', url: '', show: true },
  { id: 'faq', label: 'FAQ', group: 'support', content: '', url: '', show: true },
  { id: 'terms', label: 'Terms & Conditions', group: 'legal', content: '', url: '', show: true },
  { id: 'privacy', label: 'Privacy Policy', group: 'legal', content: '', url: '', show: true },
  { id: 'refund', label: 'Refund Policy', group: 'legal', content: '', url: '', show: true },
  { id: 'disclaimer', label: 'Disclaimer', group: 'legal', content: '', url: '', show: true },
];
export const DEFAULT_BOOK = {
  cover_badge: 'PDF', cover_title: '', cover_sub: 'Study Smart\nScore High',
  cover_from: '', cover_to: '', cover_border: '', cover_title_color: '', cover_image: '',
  inside_label: 'Preview inside', inside_title: 'Flip through',
  base_icon: '🔒', base_title: 'Like what you see?', base_text: 'Unlock all pages after payment verification',
  labels: ['👀 Preview first', '🔒 Secure download', '⭐ Exam-ready notes'], show_labels: true, speed: 1900,
};
export const DEFAULT_TEXTS = {
  search_placeholder: 'Search PDFs...', popular_title: 'Popular Exams',
  likes_enabled: true,
  reviews_hidden: false, reviews_title: 'What Our Students Say', reviews_sub: 'Genuine feedback from real students', reviews_button: 'Write a Review',
  reviews_empty: 'No reviews yet. Be the first to write one!',
};

// Old Bengali defaults that may already be saved in the database: treated as "not customised" so the right language shows.
export const LEGACY_DEFAULTS = new Set(['প্রকৃত ছাত্র-ছাত্রীদের মতামত', 'এখনো কোনো review নেই। প্রথম review আপনিই দিন!']);
