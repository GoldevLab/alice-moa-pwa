import {
  formatTeensLevel,
  inferTeensLevel,
  type TeensLevel,
} from '~/data/teens-levels';

export type PlacementQuestionType = 'text' | 'textarea' | 'select' | 'radio' | 'audio';

export interface PlacementQuestion {
  id: string;
  prompt: string;
  type: PlacementQuestionType;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  options?: { value: string; label: string }[];
  section: string;
  points?: number;
  correctAnswer?: string;
  // Para preguntas de listening con audio pregrabado
  audioSrc?: string;
}

export interface PlacementSection {
  id: string;
  title: string;
  description?: string;
  questions: PlacementQuestion[];
}

export type PlacementAnswerMap = Record<string, string | undefined>;

export const placementSections: PlacementSection[] = [
  // ============================================================
  // 1. Información personal (no puntúa, solo contexto)
  // ============================================================
  {
    id: 'personal-info',
    title: 'Personal Information',
    description: 'Tell us more about you so we can contextualize your English level.',
    questions: [
      {
        id: 'q1_name',
        prompt: '1. What is your name?',
        type: 'text',
        required: true,
        placeholder: 'Full name',
        section: 'Personal Information',
      },
      {
        id: 'q1_email',
        prompt: 'What is your email?',
        type: 'text',
        required: true,
        placeholder: 'name@example.com',
        section: 'Personal Information',
      },
      {
        id: 'q1_phone',
        prompt: 'What is your phone number?',
        type: 'text',
        required: true,
        placeholder: '+58 412-0000000',
        section: 'Personal Information',
      },
      {
        id: 'q2_country',
        prompt: '2. Where are you from?',
        type: 'text',
        required: true,
        placeholder: 'Country / City',
        section: 'Personal Information',
      },
      {
        id: 'q3_birthdate',
        prompt: '3. Date of birth',
        type: 'text',
        required: true,
        placeholder: 'DD/MM/YYYY',
        section: 'Personal Information',
      },
      {
        id: 'q4_address',
        prompt: '4. What is your address?',
        type: 'text',
        required: true,
        placeholder: 'Street, City',
        section: 'Personal Information',
      },
    ],
  },

  // ============================================================
  // 2. Listening (respuestas escritas, con audioSrc)
  // ============================================================
  {
    id: 'listening-mp3',
  title: 'Listening Comprehension',
  description: 'Listen to each audio and answer the question in writing.',
  questions: [
    {
      id: 'q_listen_3',
      type: 'textarea',
      prompt:
        'Listen to the audio and describe the speaker’s morning routine. Mention at least two activities.',
      audioSrc: '/breakfast.mp3',
      required: true,
      placeholder: 'Write your answer here',
      section: 'Listening',
    },
    {
      id: 'q_listen_2',
      type: 'textarea',
      prompt:
        'Listen to the audio and explain the main idea about technology that the speaker mentions.',
      audioSrc: '/tech.mp3',
      required: true,
      placeholder: 'Write your answer here',
      section: 'Listening',
    },
    {
      id: 'q_listen_1',
      type: 'textarea',
      prompt:
        'Listen to the audio and summarize what the speaker says about the future.',
      audioSrc: '/future.mp3',
      required: true,
      placeholder: 'Write your answer here',
      section: 'Listening',
    },
  ],
},

  // ============================================================
  // 3. Speaking (audio que graba el estudiante, tipo 'audio')
  // ============================================================
  {
    id: 'speaking-audio',
    title: 'Speaking (Audio)',
    description:
      'Record your answer to each question. You may leave it blank, but it will be marked as incorrect if no audio is provided.',
    questions: [
      {
        id: 'q_audio_1',
        prompt:
          'Introduce yourself. Say your name, where you are from, and one thing you like doing in your free time.',
        type: 'audio',
        required: false,
        section: 'Speaking',
      },
      {
        id: 'q_audio_2',
        prompt:
          'Describe your city or town. Mention at least two places and what people can do there.',
        type: 'audio',
        required: false,
        section: 'Speaking',
      },
      {
        id: 'q_audio_3',
        prompt:
          'Talk about your daily routine on a typical weekday. Mention at least three activities and the time you usually do them.',
        type: 'audio',
        required: false,
        section: 'Speaking',
      },
      {
        id: 'q_audio_4',
        prompt:
          'Talk about your hobbies. Which activities do you enjoy and how often do you do them?',
        type: 'audio',
        required: false,
        section: 'Speaking',
      },
      {
        id: 'q_audio_5',
        prompt:
          'If you could travel anywhere in the world, where would you go and why?',
        type: 'audio',
        required: false,
        section: 'Speaking',
      },
      {
        id: 'q_audio_6',
        prompt:
          'Describe a memorable event from your life and its significance.',
        type: 'audio',
        required: false,
        section: 'Speaking',
      },
    ],
  },

  // ============================================================
  // 4. Professions & Spelling (puntúa)
  // ============================================================
  {
    id: 'professions-spelling',
    title: 'Professions & Spelling',
    description: 'Quick vocabulary warm-up.',
    questions: [
      {
        id: 'q5_profession',
        prompt: '5. Choose the profession that works with crops and animals.',
        type: 'radio',
        required: true,
        section: 'Vocabulary',
        options: [
          { value: 'farmer', label: 'Farmer' },
          { value: 'journalist', label: 'Journalist' },
          { value: 'astronaut', label: 'Astronaut' },
          { value: 'doctor', label: 'Doctor' },
        ],
        points: 1,
        correctAnswer: 'farmer',
      },
      {
        id: 'q6_profession',
        prompt: '6. Choose the profession that represents people in court.',
        type: 'radio',
        required: true,
        section: 'Vocabulary',
        options: [
          { value: 'baseball_player', label: 'Baseball player' },
          { value: 'chef', label: 'Chef' },
          { value: 'lawyer', label: 'Lawyer' },
          { value: 'painter', label: 'Painter' },
        ],
        points: 1,
        correctAnswer: 'lawyer',
      },
      {
        id: 'q7_spelling',
        prompt: '7. Choose the correctly spelled word.',
        type: 'radio',
        required: true,
        section: 'Vocabulary',
        options: [
          { value: 'bich', label: 'Bich' },
          { value: 'bech', label: 'Bech' },
          { value: 'baech', label: 'Baech' },
          { value: 'beach', label: 'Beach' },
        ],
        points: 1,
        correctAnswer: 'beach',
      },
    ],
  },

  // ============================================================
  // 5. Grammar Correction (puede ser corregido manualmente)
  // ============================================================
  {
    id: 'grammar-correction',
    title: 'Grammar Correction',
    description: 'Rewrite each sentence correctly.',
    questions: [
      {
        id: 'q8_correction',
        prompt: '8. Correct this sentence: “Mary are in Merida.”',
        type: 'text',
        required: true,
        section: 'Grammar',
      },
      {
        id: 'q9_correction',
        prompt: '9. Correct this sentence: “Joey is mine brother.”',
        type: 'text',
        required: true,
        section: 'Grammar',
      },
      {
        id: 'q10_correction',
        prompt: '10. Correct this sentence: “My mom am in the kitchen.”',
        type: 'text',
        required: true,
        section: 'Grammar',
      },
      {
        id: 'q11_correction',
        prompt: '11. Correct this sentence: “They is at the supermarket.”',
        type: 'text',
        required: true,
        section: 'Grammar',
      },
    ],
  },

  // ============================================================
  // 6. Verb Tenses (puntúa)
  // ============================================================
  {
    id: 'verb-tenses',
    title: 'Verb Tenses',
    description:
      'Complete the letter with the correct option.\n\nDear Ana,\nI ____ to you so you know what is happening in my life. I ____ move to San Diego with a friend that I ____ last summer. She ____ help me get my things there since she ____ a car. I ____ an apartment next to a big square. You ____ love it.\n\nChoose the best option for each blank.',
    questions: [
      {
        id: 'q12_letter',
        prompt:
          '12. I ______ to you so you know what is happening in my life.',
        type: 'radio',
        required: true,
        section: 'Verb Tenses',
        options: [
          { value: 'write', label: 'Write' },
          { value: 'writing', label: 'Writing' },
          { value: 'wrote', label: 'Wrote' },
          { value: 'writes', label: 'Writes' },
        ],
        points: 1,
        correctAnswer: 'write',
      },
      {
        id: 'q13_letter',
        prompt: '13. so you know what is ______ on in my life.',
        type: 'radio',
        required: true,
        section: 'Verb Tenses',
        options: [
          { value: 'goes', label: 'Goes' },
          { value: 'go', label: 'Go' },
          { value: 'going', label: 'Going' },
          { value: 'goin', label: 'Goin' },
        ],
        points: 1,
        correctAnswer: 'going',
      },
      {
        id: 'q14_letter',
        prompt: '14. I ______ move to San Diego with a friend.',
        type: 'radio',
        required: true,
        section: 'Verb Tenses',
        options: [
          { value: 'are_going_to', label: 'Are going to' },
          { value: 'is_go_to', label: 'Is go to' },
          { value: 'am_going_to', label: 'Am going to' },
          { value: 'am_goin_to', label: 'Am goin to' },
        ],
        points: 1,
        correctAnswer: 'am_going_to',
      },
      {
        id: 'q15_letter',
        prompt: '15. that I ______ last summer.',
        type: 'radio',
        required: true,
        section: 'Verb Tenses',
        options: [
          { value: 'met', label: 'Met' },
          { value: 'meet', label: 'Meet' },
          { value: 'meeting', label: 'Meeting' },
          { value: 'meting', label: 'Meting' },
        ],
        points: 1,
        correctAnswer: 'met',
      },
      {
        id: 'q16_letter',
        prompt: '16. She ______ help me get my things there.',
        type: 'radio',
        required: true,
        section: 'Verb Tenses',
        options: [
          { value: 'will', label: 'Will' },
          { value: 'be_going_to', label: 'Be going to' },
          { value: 'wont', label: "Won't" },
          { value: 'will_go_to', label: 'Will go to' },
        ],
        points: 1,
        correctAnswer: 'will',
      },
      {
        id: 'q17_letter',
        prompt: '17. since she ______ a car.',
        type: 'radio',
        required: true,
        section: 'Verb Tenses',
        options: [
          { value: 'have', label: 'Have' },
          { value: 'going_to_have', label: 'Going to have' },
          { value: 'has', label: 'Has' },
          { value: 'had', label: 'Had' },
        ],
        points: 1,
        correctAnswer: 'has',
      },
      {
        id: 'q18_letter',
        prompt: '18. I ______ an apartment next to a big square.',
        type: 'radio',
        required: true,
        section: 'Verb Tenses',
        options: [
          { value: 'rented', label: 'Rented' },
          { value: 'rents', label: 'Rents' },
          { value: 'rent', label: 'Rent' },
          { value: 'renting', label: 'Renting' },
        ],
        points: 1,
        correctAnswer: 'rented',
      },
      {
        id: 'q19_letter',
        prompt: '19. you ______ love it.',
        type: 'radio',
        required: true,
        section: 'Verb Tenses',
        options: [
          { value: 'are_to', label: 'Are to' },
          { value: 'will', label: 'Will' },
          { value: 'are_to_go', label: 'Are to go' },
          { value: 'be_will', label: 'Be will' },
        ],
        points: 1,
        correctAnswer: 'will',
      },
    ],
  },

  // ============================================================
  // 7. Vacation Writing
  // ============================================================
  {
    id: 'vacation-writing',
    title: 'Vacation Writing',
    description: 'Tell us about your last vacation.',
    questions: [
      {
        id: 'q20_vacation',
        prompt:
          '20. Tell us about the last time you went on vacation. Where did you go? Who did you go with? What did you do?',
        type: 'textarea',
        required: true,
        helperText: 'Aim for 4-5 sentences.',
        section: 'Writing',
      },
    ],
  },

  // ============================================================
  // 8. Reading: Climate Change (puntúa)
  // ============================================================
  {
    id: 'climate-text',
    title: 'Reading: Climate Change',
    description: 'Complete the text with the correct option.',
    questions: [
      {
        id: 'q21_climate',
        prompt:
          '21. Some organizations ______ that everybody can influence global warming.',
        type: 'radio',
        required: true,
        section: 'Reading',
        options: [
          { value: 'have_said', label: 'Have said' },
          { value: 'she_said', label: 'She said' },
          { value: 'talking', label: 'Talking' },
          { value: 'planet', label: 'Planet' },
        ],
        points: 1,
        correctAnswer: 'have_said',
      },
      {
        id: 'q22_climate',
        prompt: '22. ______ can influence global warming.',
        type: 'radio',
        required: true,
        section: 'Reading',
        options: [
          { value: 'nobody', label: 'Nobody' },
          { value: 'everybody', label: 'Everybody' },
          { value: 'warming', label: 'Warming' },
          { value: 'something', label: 'Something' },
        ],
        points: 1,
        correctAnswer: 'everybody',
      },
      {
        id: 'q23_climate',
        prompt:
          '23. We can limit the ______ greenhouse gases do to the atmosphere.',
        type: 'radio',
        required: true,
        section: 'Reading',
        options: [
          { value: 'improve', label: 'Improve' },
          { value: 'water', label: 'Water' },
          { value: 'star', label: 'Star' },
          { value: 'damage', label: 'Damage' },
        ],
        points: 1,
        correctAnswer: 'damage',
      },
      {
        id: 'q24_climate',
        prompt:
          '24. Our Earth can ______ by the way we use energy.',
        type: 'radio',
        required: true,
        section: 'Reading',
        options: [
          { value: 'harm', label: 'Harm' },
          { value: 'benefit', label: 'Benefit' },
          { value: 'good', label: 'Good' },
          { value: 'mistaken', label: 'Mistaken' },
        ],
        points: 1,
        correctAnswer: 'benefit',
      },
      {
        id: 'q25_climate',
        prompt: '25. around the ______.',
        type: 'radio',
        required: true,
        section: 'Reading',
        options: [
          { value: 'anyone', label: 'Anyone' },
          { value: 'trash', label: 'Trash' },
          { value: 'already', label: 'Already' },
          { value: 'world', label: 'World' },
        ],
        points: 1,
        correctAnswer: 'world',
      },
      {
        id: 'q26_climate',
        prompt: '26. ______ they introduced fuel-efficient vehicles.',
        type: 'radio',
        required: true,
        section: 'Reading',
        options: [
          { value: 'just', label: 'Just' },
          { value: 'never', label: 'Never' },
          { value: 'always', label: 'Always' },
          { value: 'since', label: 'Since' },
        ],
        points: 1,
        correctAnswer: 'since',
      },
      {
        id: 'q27_climate',
        prompt:
          '27. the environment ______ a little bit.',
        type: 'radio',
        required: true,
        section: 'Reading',
        options: [
          { value: 'it_could', label: 'It could' },
          { value: 'it_doesnt', label: "It doesn't" },
          { value: 'has_changed', label: 'Has changed' },
          { value: 'should', label: 'Should' },
        ],
        points: 1,
        correctAnswer: 'has_changed',
      },
      {
        id: 'q28_climate',
        prompt:
          '28. ______ is safe from changing their lifestyles.',
        type: 'radio',
        required: true,
        section: 'Reading',
        options: [
          { value: 'nobody', label: 'Nobody' },
          { value: 'no', label: 'No' },
          { value: 'all_the_world', label: 'All the world' },
          { value: 'life', label: 'Life' },
        ],
        points: 1,
        correctAnswer: 'nobody',
      },
      {
        id: 'q29_climate',
        prompt: '29. Global warming ______.',
        type: 'radio',
        required: true,
        section: 'Reading',
        options: [
          { value: 'havent_stopped_yet', label: "Haven't stopped yet" },
          { value: 'havent_stop_already', label: "Haven't stop already" },
          { value: 'hasnt_stopped_yet', label: "Hasn't stopped yet" },
          { value: 'has_stopped_already', label: 'Has stopped already' },
        ],
        points: 1,
        correctAnswer: 'hasnt_stopped_yet',
      },
      {
        id: 'q30_climate',
        prompt: '30. ______ needs to do their part.',
        type: 'radio',
        required: true,
        section: 'Reading',
        options: [
          { value: 'solar_system', label: 'The solar system' },
          { value: 'since', label: 'Since' },
          { value: 'just', label: 'Just' },
          { value: 'everyone', label: 'Everyone' },
        ],
        points: 1,
        correctAnswer: 'everyone',
      },
    ],
  },

  // ============================================================
  // 9. Prepositions (puntúa)
  // ============================================================
  {
    id: 'prepositions',
    title: 'Prepositions',
    description: 'Choose the correct preposition.',
    questions: [
      {
        id: 'q31_preposition',
        prompt: '31. The birds are flying ______ the city.',
        type: 'radio',
        required: true,
        section: 'Prepositions',
        options: [
          { value: 'at', label: 'At' },
          { value: 'over', label: 'Over' },
          { value: 'in', label: 'In' },
          { value: 'under', label: 'Under' },
        ],
        points: 1,
        correctAnswer: 'over',
      },
      {
        id: 'q32_preposition',
        prompt: '32. The rabbit is going ______ the cave.',
        type: 'radio',
        required: true,
        section: 'Prepositions',
        options: [
          { value: 'into', label: 'Into' },
          { value: 'out', label: 'Out' },
          { value: 'of', label: 'Of' },
          { value: 'on', label: 'On' },
        ],
        points: 1,
        correctAnswer: 'into',
      },
      {
        id: 'q33_preposition',
        prompt: '33. Karl is running ______ the forest.',
        type: 'radio',
        required: true,
        section: 'Prepositions',
        options: [
          { value: 'along', label: 'Along' },
          { value: 'under', label: 'Under' },
          { value: 'through', label: 'Through' },
          { value: 'out', label: 'Out' },
        ],
        points: 1,
        correctAnswer: 'through',
      },
      {
        id: 'q34_preposition',
        prompt: '34. The tourists are getting ______ the plane.',
        type: 'radio',
        required: true,
        section: 'Prepositions',
        options: [
          { value: 'above', label: 'Above' },
          { value: 'away_from', label: 'Away from' },
          { value: 'off', label: 'Off' },
          { value: 'on', label: 'On' },
        ],
        points: 1,
        correctAnswer: 'on',
      },
    ],
  },

  // ============================================================
  // 10. Phrasal Verbs (puntúa)
  // ============================================================
  {
    id: 'phrasal-verbs',
    title: 'Phrasal Verbs',
    description: 'Choose the correct option.',
    questions: [
      {
        id: 'q35_phrasal',
        prompt:
          '35. Please, can you ______ “teacher” in the dictionary?',
        type: 'radio',
        required: true,
        section: 'Phrasal verbs',
        options: [
          { value: 'look_from', label: 'look from' },
          { value: 'look_up', label: 'look up' },
        ],
        points: 1,
        correctAnswer: 'look_up',
      },
      {
        id: 'q36_phrasal',
        prompt:
          '36. I need to ______ the use of the present perfect tense.',
        type: 'radio',
        required: true,
        section: 'Phrasal verbs',
        options: [
          { value: 'go_over', label: 'go over' },
          { value: 'go_out', label: 'go out' },
        ],
        points: 1,
        correctAnswer: 'go_over',
      },
      {
        id: 'q37_phrasal',
        prompt:
          '37. I need you to ______ your sister while I’m at the shops.',
        type: 'radio',
        required: true,
        section: 'Phrasal verbs',
        options: [
          { value: 'look_after', label: 'look after' },
          { value: 'look_up', label: 'look up' },
        ],
        points: 1,
        correctAnswer: 'look_after',
      },
      {
        id: 'q38_phrasal',
        prompt:
          '38. Carl ______ his uncle, they have the same mannerisms.',
        type: 'radio',
        required: true,
        section: 'Phrasal verbs',
        options: [
          { value: 'takes_after', label: 'takes after' },
          { value: 'takes_into', label: 'takes into' },
        ],
        points: 1,
        correctAnswer: 'takes_after',
      },
      {
        id: 'q39_phrasal',
        prompt:
          '39. ______ this form and come back when you have completed it.',
        type: 'radio',
        required: true,
        section: 'Phrasal verbs',
        options: [
          { value: 'fill_on', label: 'Fill on' },
          { value: 'fill_out', label: 'Fill out' },
        ],
        points: 1,
        correctAnswer: 'fill_out',
      },
      {
        id: 'q40_phrasal',
        prompt:
          '40. I can’t wait to ______ with my best friend.',
        type: 'radio',
        required: true,
        section: 'Phrasal verbs',
        options: [
          { value: 'catch_out', label: 'catch out' },
          { value: 'catch_up', label: 'catch up' },
        ],
        points: 1,
        correctAnswer: 'catch_up',
      },
    ],
  },

  // ============================================================
  // 11. Reading: Languages Around the World (preguntas abiertas)
  // ============================================================
  {
    id: 'languages-reading',
    title: 'Reading: Languages Around the World',
    description:
      'Read the excerpt, then answer the questions.\n\nIn his book *The Position of the German Language in the World*, sociolinguist Ulrich Ammon compares more than 12,000 languages. He notes that English is the most widely used international language in business, science, and the internet, while Mandarin Chinese has the largest number of native speakers. German is strong in engineering and exports, but it is rarely used for scientific publishing compared to English. A 2014 Natixis study predicted that French could become the most‑spoken language by 2050 because of African population growth, but the study ignored the dominance of English in higher education and technology. Ammon concludes that English will remain the global lingua franca in the near future, with regional powers like Spanish, Arabic, and French growing mainly through demographics.',
    questions: [
      {
        id: 'q41_language_article',
        prompt: '41. What is a proper title for the text?',
        type: 'text',
        required: true,
        section: 'Reading Comprehension',
      },
      {
        id: 'q42_language_article',
        prompt: '42. What is his book about?',
        type: 'text',
        required: true,
        section: 'Reading Comprehension',
      },
      {
        id: 'q43_language_article',
        prompt:
          '43. Which language will continue to top the rankings in the near future?',
        type: 'text',
        required: true,
        section: 'Reading Comprehension',
      },
      {
        id: 'q44_language_article',
        prompt:
          '44. Which language is rarely used in science according to the text?',
        type: 'text',
        required: true,
        section: 'Reading Comprehension',
      },
      {
        id: 'q45_language_article',
        prompt:
          '45. What did the 2014 Natixis study predict and what was its flaw?',
        type: 'textarea',
        required: true,
        section: 'Reading Comprehension',
      },
      {
        id: 'q46_language_article',
        prompt: '46. What is your favorite language and why?',
        type: 'textarea',
        required: true,
        section: 'Reading Comprehension',
      },
    ],
  },

  // ============================================================
  // 12. Reported Speech (abierto)
  // ============================================================
  {
    id: 'reported-speech',
    title: 'Reported Speech',
    description: 'Transform each quote.',
    questions: [
      {
        id: 'q47_reported',
        prompt:
          '47. “These sculptures have been modern…” → The lady told the crowd…',
        type: 'text',
        required: true,
        section: 'Reported Speech',
      },
      {
        id: 'q48_reported',
        prompt:
          '48. “What was the answer?” → The Riddler asked…',
        type: 'text',
        required: true,
        section: 'Reported Speech',
      },
      {
        id: 'q49_reported',
        prompt:
          '49. “Speak now!” → The officer yelled at the witness…',
        type: 'text',
        required: true,
        section: 'Reported Speech',
      },
    ],
  },

  // ============================================================
  // 13. Perfect City Essay
  // ============================================================
  {
    id: 'perfect-city',
    title: 'Perfect City Essay',
    description:
      'Imagine a perfect city and describe it using all the highlighted connectors.',
    questions: [
      {
        id: 'q50_perfect_city',
        prompt:
          '50. Imagine a perfect city and describe it using all the highlighted connectors. Use these words at least once: moreover, besides, apart from, although, therefore. (~360 words)',
        type: 'textarea',
        required: true,
        helperText:
          'Aim for ~360 words and include all five connectors.',
        section: 'Writing',
      },
    ],
  },
];

// ============================================================
// Índice de preguntas
// ============================================================
const questionIndex = new Map<string, PlacementQuestion>();
placementSections.forEach((section) => {
  section.questions.forEach((question) => {
    questionIndex.set(question.id, question);
  });
});

export interface PlacementScoreDetail {
  questionId: string;
  prompt: string;
  userAnswer?: string;
  isCorrect: boolean;
  earned: number;
  points: number;
  correctAnswer?: string;
}

export type { TeensLevel };

export function computePlacementScore(
  answers: PlacementAnswerMap,
): {
  total: number;
  max: number;
  level: string;
  teensLevel: TeensLevel;
  details: PlacementScoreDetail[];
} {
  let total = 0;
  let max = 0;
  const details: PlacementScoreDetail[] = [];

  for (const [questionId, answer] of Object.entries(answers)) {
    const question = questionIndex.get(questionId);
    if (!question || !question.points || !question.correctAnswer) {
      continue;
    }

    const normalizedAnswer = (answer ?? '').toLowerCase().trim();
    const normalizedCorrect = question.correctAnswer.toLowerCase().trim();
    const isCorrect = normalizedAnswer === normalizedCorrect;
    const points = question.points;
    max += points;
    if (isCorrect) {
      total += points;
    }

    details.push({
      questionId,
      prompt: question.prompt,
      userAnswer: answer,
      isCorrect,
      earned: isCorrect ? points : 0,
      points,
      correctAnswer: question.correctAnswer,
    });
  }

  const teensLevel = inferTeensLevel(total, max);
  const level = formatTeensLevel(teensLevel);
  return { total, max, level, teensLevel, details };
}

/** @deprecated Usar inferTeensLevel desde ~/data/teens-levels */
export function inferLevel(score: number, max: number): string {
  return formatTeensLevel(inferTeensLevel(score, max));
}

export function getQuestionById(
  questionId: string,
): PlacementQuestion | undefined {
  return questionIndex.get(questionId);
}
