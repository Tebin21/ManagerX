export interface TutorialCategory {
  id: string;
  title: string;
  icon: string; // Ionicons name
  order: number;
}

export interface TutorialVideo {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  youtubeId: string;
  thumbnailUrl?: string;
  durationSec?: number;
  order: number;
}
