// src/types/playbook.ts

export interface PlaybookProConfig {
    // 1. Document Structure
    pageSize: 'a4' | 'letter';
    orientation: 'portrait' | 'landscape';
    margins: 'normal' | 'narrow' | 'wide';

    // 2. Typography
    fontFamily: 'times' | 'arial' | 'calibri';
    fontSize: number; // 10, 11, 12
    lineSpacing: '1.0' | '1.5' | '2.0';
    alignment: 'left' | 'justify';

    // 3. Structure & References
    addPageNumbers: boolean;
    autoToc: boolean;
    citationStyle: 'apa' | 'mla' | 'chicago' | 'harvard';

    // 4. Advanced
    imageAlignment: 'center' | 'left';
}

export interface PlaybookXConfig {
    // 1. Slide Structure
    aspectRatio: '16x9' | '4x3';
    theme: 'academic' | 'corporate' | 'creative' | 'dark';

    // 2. Content Rules
    maxBulletsPerSlide: number; // Default 7
    autoSplitLongText: boolean; // 3-Line Rule

    // 3. Extras
    addSpeakerNotes: boolean;
    addSlideNumbers: boolean;

    // 4. Export
    exportFormat: 'pptx'; // Future: 'pdf'
}
