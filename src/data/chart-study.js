export const STUDY_REVIEWED_AT = '2026-10-15';

export const STUDY_SOURCES = {
  green: {
    name: 'Tonevo: GreeN chart notes',
    url: 'https://tonevoadventcalendar.hatenablog.com/entry/2023/12/24/203835',
    published: '2023-12-24',
    scope: 'Selected GreeN ST MASTER patterns. Original levels may be outdated.',
  },
  beatech: {
    name: 'BEATECH: SSS+ discussion',
    url: 'https://beatech.hatenablog.com/entry/2024/07/15/220559',
    published: '2024-07-15',
    scope: 'Player discussion for SSS+, not AP. Selected pattern observations only.',
  },
  umiyuri: {
    name: 'maimai Wiki: Umiyuri',
    url: 'https://gamerch.com/maimai/533675',
    published: null,
    scope: 'ST MASTER section beginning around combo 301.',
  },
  hecatoncheir: {
    name: 'maimai Wiki: HECATONCHEIR',
    url: 'https://gamerch.com/maimai/534205',
    published: null,
    scope: 'DX MASTER chorus pattern and BREAK notes.',
  },
};

export const STUDY_SKILLS = {
  'slide-timing': 'Slide timing',
  'slide-flow': 'Slide sequences',
  'tap-slide': 'Tap / slide coordination',
  chords: 'Simultaneous taps',
  independence: 'Hand independence',
  holds: 'Hold coordination',
  speed: 'Fast inputs',
  reading: 'Tap reading',
  spins: 'Spins',
  trills: 'Trills',
  jacks: 'Repeated taps',
  breaks: 'BREAK control',
};

// Exact chart identities; these summaries are not automatic skill classifications.
export const CHART_STUDIES = [
  { chartId: '186-standard-master', title: 'イアイア★ナイトオブデザイア', skills: ['slide-flow'], note: 'Concentrated slide sequence at the ending.', source: 'green' },
  { chartId: '208-standard-master', title: 'Her Dream Is To Be A Fantastic Sorceress', skills: ['holds', 'independence'], note: 'Holds constrain movement between inputs.', source: 'green' },
  { chartId: '241-standard-master', title: 'Cosmic Train', skills: ['slide-flow'], note: 'Frequent slides throughout the chart.', source: 'green' },
  { chartId: '207-standard-master', title: '時空を超えて久しぶり！', skills: ['slide-flow'], note: 'Slide routing is a central feature.', source: 'green' },
  { chartId: '185-standard-master', title: '＊ハロー、プラネット。', skills: ['independence', 'chords'], note: 'Different hand motions and moving alternating taps.', source: 'green' },
  { chartId: '189-standard-master', title: '弱虫モンブラン', skills: ['chords', 'slide-timing'], note: 'Simultaneous taps alongside waiting slides.', source: 'green' },
  { chartId: '202-standard-master', title: 'Grip & Break down !!', skills: ['speed'], note: 'Fast movements with precise control.', source: 'green' },
  { chartId: '226-standard-master', title: 'Blew Moon', skills: ['reading'], note: 'Dense taps create reading demands.', source: 'green' },
  { chartId: '216-standard-master', title: 'Mysterious Destiny', skills: ['slide-flow'], note: 'Almost entirely slides, apart from BREAK taps.', source: 'green' },
  { chartId: '194-standard-master', title: '放課後ストライド', skills: ['tap-slide'], note: 'Careful slide routing avoids accidental inputs.', source: 'green' },
  { chartId: '209-standard-master', title: 'ココロスキャンのうた', skills: ['spins'], note: 'Spins are a highlighted difficulty.', source: 'green' },
  { chartId: '261-standard-master', title: 'Death Scythe', skills: ['tap-slide'], note: 'Named Death Scythe pattern and precision traps.', source: 'green' },
  { chartId: '227-standard-master', title: 'Garakuta Doll Play', skills: ['chords', 'spins'], note: 'Moving simultaneous taps lead into reversing spins.', source: 'green' },
  { chartId: '417-standard-master', title: 'ウミユリ海底譚', skills: ['tap-slide', 'slide-timing'], note: 'Alternate taps while delaying each slide start.', source: 'umiyuri' },
  { chartId: '1382-dx-master', title: 'HECATONCHEIR', skills: ['tap-slide', 'breaks'], note: 'Umiyuri-style chorus; many BREAK notes.', source: 'hecatoncheir' },
  { chartId: '365-standard-master', title: 'ガラテアの螺旋', skills: ['slide-flow', 'spins'], note: 'Slide overlap and changing spin rhythms.', source: 'beatech' },
  { chartId: '365-standard-remaster', title: 'ガラテアの螺旋', skills: ['slide-flow'], note: 'Slide control is central to the discussion.', source: 'beatech' },
  { chartId: '384-standard-master', title: 'VERTeX', skills: ['speed', 'breaks'], note: 'Fast hands and difficult BREAK passages.', source: 'beatech' },
  { chartId: '456-standard-master', title: 'Glorious Crown', skills: ['tap-slide'], note: 'Early slide overlaps complicate precision.', source: 'beatech' },
  { chartId: '773-standard-master', title: 'SILENT BLUE', skills: ['slide-flow'], note: 'Sustained slides and a difficult ending.', source: 'beatech' },
  { chartId: '779-standard-master', title: '怒槌', skills: ['trills', 'tap-slide'], note: 'Axial trills alongside slide combinations.', source: 'beatech' },
  { chartId: '1379-dx-master', title: 'sølips', skills: ['jacks', 'tap-slide'], note: 'Repeated BREAK taps and slide passages.', source: 'beatech' },
  { chartId: '1612-dx-master', title: 'Latent Kingdom', skills: ['speed'], note: 'Fast, direct movements require control.', source: 'beatech' },
  { chartId: '1662-dx-master', title: 'raputa', skills: ['trills', 'speed'], note: 'Fast trills with substantial movement.', source: 'beatech' },
];
