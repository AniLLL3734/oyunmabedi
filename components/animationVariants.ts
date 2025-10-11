import { Variants } from 'framer-motion';

// Bir objede, tüm zamanların en ileri düzey animasyonlarını tanımlayalım.
export const animationVariants: { [key: string]: Variants } = {

  // --- TEMEL BİLİM-KURGU EFEKTLERİ ---

  // NEON PULSE: Daha gerçekçi, titreyen ve "gazlı" bir neon hissi.
  neon_pulse_animation: {
    initial: {
      scale: 1,
      filter: `drop-shadow(0 0 2px #00ffff) drop-shadow(0 0 5px #00ffff) drop-shadow(0 0 10px #073a3a) opacity(0.9)`
    },
    animate: {
      scale: [1, 1.01, 1, 1.02, 1],
      filter: [
        `drop-shadow(0 0 2px #00ffff) drop-shadow(0 0 8px #00ffff) drop-shadow(0 0 15px #073a3a) opacity(0.9)`,
        `drop-shadow(0 0 4px #00ffff) drop-shadow(0 0 12px #00ffff) drop-shadow(0 0 25px #073a3a) opacity(1)`,
        `drop-shadow(0 0 3px #00ffff) drop-shadow(0 0 10px #00ffff) drop-shadow(0 0 20px #073a3a) opacity(0.85)`,
        `drop-shadow(0 0 5px #00ffff) drop-shadow(0 0 15px #00ffff) drop-shadow(0 0 30px #073a3a) opacity(1)`,
        `drop-shadow(0 0 2px #00ffff) drop-shadow(0 0 8px #00ffff) drop-shadow(0 0 15px #073a3a) opacity(0.9)`,
      ],
      transition: {
        duration: 2.5,
        ease: 'easeInOut',
        repeat: Infinity,
        times: [0, 0.25, 0.5, 0.75, 1] // Hareketin zaman içindeki dağılımı
      },
    },
  },

  // ELECTRIC ARC: Yüksek voltajlı, anlık, kaotik ve tehlikeli bir elektrik arkı.
  electric_arc_animation: {
    initial: {
      filter: "blur(0.5px)",
      opacity: 1,
    },
    animate: {
      x: [0, 2, -1, 3, -2, 1, -3, 2, 0],
      y: [0, -1, 2, -3, 1, -2, 3, -1, 0],
      rotate: [0, -0.2, 0.4, -0.1, 0.3, -0.4, 0.2, 0],
      scale: [1, 0.98, 1.02, 0.99, 1.01, 1],
      filter: ["blur(1px) contrast(3)", "blur(0.5px) contrast(2)", "blur(1.5px) contrast(3)"],
      boxShadow: [
        "0 0 5px #fff, 0 0 10px #ffff00, 0 0 20px #ffff00",
        "0 0 2px #fff, 0 0 5px #ffff00, 0 0 10px #ffff00, inset 0 0 5px #ffffaa", // içeriye de parlama ekler
        "0 0 8px #fff, 0 0 15px #ffff00, 0 0 25px #ffff00"
      ],
      opacity: [1, 0.8, 1, 0.9, 0.75, 1],
      transition: {
        duration: 0.15, // Çok daha hızlı ve keskin
        repeat: Infinity,
        ease: 'linear'
      },
    },
  },

  hologram_glitch_animation: { /* Bu animasyon CSS'te kalıyor, o hali zaten ileri düzey. */
      initial: {},
      animate: {}
  },

  // COSMIC PARTICLES: Nebulayı andıran, yavaşça dönen, renk değiştiren üç boyutlu bir enerji küresi.
  cosmic_particles_animation: {
    initial: {
      scale: 1,
      rotate: 0,
    },
    animate: {
      scale: [1, 1.03, 1],
      rotateY: [0, 180, 360],
      filter: [
        'hue-rotate(0deg) drop-shadow(0 0 15px #8a2be2)',
        'hue-rotate(60deg) drop-shadow(0 0 20px #4b0082)',
        'hue-rotate(0deg) drop-shadow(0 0 15px #8a2be2)'
      ],
      boxShadow: [
        '0 0 20px #8a2be2, 0 0 30px #4b0082, inset 0 0 10px #e6e6fa',
        '0 0 35px #9400d3, 0 0 50px #8a2be2, inset 0 0 15px #e6e6fa',
        '0 0 20px #8a2be2, 0 0 30px #4b0082, inset 0 0 10px #e6e6fa'
      ],
      transition: {
        duration: 10,
        ease: "easeInOut",
        repeat: Infinity,
        repeatType: 'mirror',
      },
    },
  },

  // FIRE PARTICLES: Gerçekçi ateş titremesi, ısı distorsiyonu ve parlayan kor efekti.
  fire_particles_animation: {
    initial: {},
    animate: {
      y: [0, -4, 2, -3, 1, -1, 0],
      scale: [1, 1.05, 0.98, 1.03, 1],
      filter: [
        "blur(1px) contrast(2.5) brightness(1.1)",
        "blur(1.5px) contrast(3) brightness(1.2)",
        "blur(1px) contrast(2.5) brightness(1.0)",
        "blur(2px) contrast(2.8) brightness(1.3)",
        "blur(1px) contrast(2.5) brightness(1.1)",
      ],
      boxShadow: [
        "0 0 5px #ffd700, 0 0 15px #ff8c00, 0 0 25px #ff4500",
        "0 0 10px #ffd700, 0 0 25px #ff8c00, 0 0 40px #ff4500",
        "0 0 8px #ffd700, 0 0 20px #ff8c00, 0 0 30px #ff4500",
        "0 0 12px #ffd700, 0 0 30px #ff8c00, 0 0 50px #ff4500, inset 0 0 5px #ffefd5",
        "0 0 5px #ffd700, 0 0 15px #ff8c00, 0 0 25px #ff4500",
      ],
      transition: {
        duration: 1.2,
        ease: "easeInOut",
        repeat: Infinity,
      },
    },
  },

  // CYBER CIRCUIT: Farklı hızlarda ve yönlerde akan çok katmanlı, dinamik veri hatları.
  // ** Bu animasyon, Framer Motion ile CSS Değişkenlerini anime etme tekniğini kullanır. **
  cyber_circuit_animation: {
    initial: {
      '--p1': '0%',
      '--p2': '100%',
      '--p3': '50%',
      '--op': 0.7,
      border: '1px solid rgba(0, 255, 255, 0.5)',
    },
    animate: {
      '--p1': '100%', // 1. katman pozisyonu
      '--p2': '0%',   // 2. katman pozisyonu
      '--p3': '150%', // 3. katman pozisyonu
      '--op': [0.7, 1, 0.7],
      // Çoklu, dinamik ve birbiri üzerinden akan gradientler
      backgroundImage: [
        `radial-gradient(circle at var(--p1) 50%, rgba(0, 255, 255, var(--op)), transparent 20%),
         radial-gradient(circle at 50% var(--p2), rgba(255, 0, 255, var(--op)), transparent 20%),
         linear-gradient(135deg, transparent 48%, rgba(0, 255, 255, 0.5) 50%, transparent 52%)`,

        `radial-gradient(circle at 50% var(--p1), rgba(0, 255, 255, var(--op)), transparent 20%),
         radial-gradient(circle at var(--p2) 50%, rgba(255, 0, 255, var(--op)), transparent 20%),
         linear-gradient(135deg, transparent 48%, rgba(0, 255, 255, 0.5) 50%, transparent 52%)`,
      ],
      borderColor: ['rgba(0, 255, 255, 0.5)', 'rgba(255, 0, 255, 0.5)', 'rgba(0, 255, 255, 0.5)'],
      transition: {
        duration: 4,
        ease: 'linear',
        repeat: Infinity,
      },
    },
  },

  // QUANTUM FIELD: Boyutlar arası geçiş yapan, kararsız, hem odaklanan hem dağılan bir enerji alanı.
  quantum_field_animation: {
    initial: {},
    animate: {
      scale: [1, 1.05, 0.95, 1.1, 0.9, 1.02, 1],
      rotate: [0, -10, 10, -5, 5, 0, 0],
      filter: [
        'blur(1px) hue-rotate(0deg)',
        'blur(2px) hue-rotate(45deg)',
        'blur(0.5px) hue-rotate(-45deg)',
        'blur(3px) hue-rotate(90deg)',
        'blur(1.5px) hue-rotate(-90deg)',
        'blur(1px) hue-rotate(0deg)',
        'blur(0px) hue-rotate(0deg)'
      ],
      boxShadow: [
        "0 0 10px #00bfff, 0 0 20px #8a2be2",
        "0 0 20px #ff00ff, 0 0 30px #00bfff, inset 0 0 10px #fff",
        "0 0 15px #8a2be2, 0 0 25px #ff00ff",
        "0 0 25px #00bfff, 0 0 40px #8a2be2, inset 0 0 15px #fff",
        "0 0 10px #00bfff, 0 0 20px #8a2be2",
      ],
      opacity: [1, 0.7, 1, 0.6, 1, 0.8, 1],
      transition: {
        duration: 6,
        ease: "easeInOut",
        repeat: Infinity,
        repeatType: 'mirror',
      }
    }
  },

  // --- TAKIM ANİMASYONLARI (MAKSİMUM SEVİYE) ---

  // GALATASARAY: Kükreyen, nabız gibi atan, güçlü ve parlak aslan aurası.
  galatasaray_animation: {
    initial: {},
    animate: {
      scale: [1, 1.04, 1, 1.05, 1],
      filter: "drop-shadow(0 0 10px #ffae00)",
      boxShadow: [
        "0 0 10px #FDB913, 0 0 20px #9f0808",
        "0 0 20px #FDB913, 0 0 40px #B30000, 0 0 5px #fff",
        "0 0 15px #FDB913, 0 0 30px #B30000",
        "0 0 25px #FDB913, 0 0 50px #B30000, 0 0 10px #fff, inset 0 0 10px #ffdd77",
        "0 0 10px #FDB913, 0 0 20px #9f0808",
      ],
      transition: {
        duration: 1.8,
        repeat: Infinity,
        ease: [0.45, 0, 0.55, 1] // Custom 'güçlü' ease
      }
    }
  },

  // FENERBAHÇE: Akıcı, dalgalanan, lacivert derinlik ve sarı ışık şeritleri.
  fenerbahce_animation: {
    initial: {},
    animate: {
        '--angle': ['0deg', '360deg'],
        backgroundImage: [
            'conic-gradient(from var(--angle) at 50% 50%, #0033cc 0%, #ffed00 20%, #0033cc 40%)',
            'conic-gradient(from var(--angle) at 50% 50%, #0033cc 0%, #ffed00 15%, #0033cc 35%)',
        ],
        scale: [1, 1.02, 1],
        boxShadow: "0 0 20px #ffed00, 0 0 30px #0033cc",
        transition: {
            '--angle': { duration: 6, ease: 'linear', repeat: Infinity },
            default: { duration: 3, ease: 'easeInOut', repeat: Infinity, repeatType: 'mirror'}
        }
    }
  },

  // BEŞİKTAŞ: Güçlü kanat çırpışını andıran, keskin ve asil siyah beyaz kontrast.
  besiktas_animation: {
    initial: {},
    animate: {
      translateY: [0, -10, 0, 5, 0],
      scale: [1, 1.02, 1],
      filter: "drop-shadow(0 5px 15px rgba(0, 0, 0, 0.7))",
      boxShadow: [
        "0 0 20px #fff, 0 0 30px #444, inset 0 0 20px #222",
        "0 0 30px #fff, 0 0 40px #888, inset 0 0 10px #333",
        "0 0 20px #fff, 0 0 30px #444, inset 0 0 20px #222",
      ],
      transition: {
        duration: 2.2,
        ease: 'easeInOut',
        repeat: Infinity
      }
    }
  },

  // TRABZONSPOR: Karadeniz fırtınası gibi, dinamik ve renkleri iç içe geçen bir enerji girdabı.
  trabzonspor_animation: {
    initial: {},
    animate: {
        rotate: [0, 360],
        '--c1': ['#5D001E', '#1B2E63', '#5D001E'],
        '--c2': ['#1B2E63', '#5D001E', '#1B2E63'],
        backgroundImage: 'radial-gradient(var(--c1) 30%, var(--c2) 70%)',
        scale: [1, 1.03, 1],
        filter: "drop-shadow(0 0 15px #1B2E63)",
        transition: {
          rotate: { ease: 'linear', duration: 8, repeat: Infinity},
          default: { duration: 4, ease: 'easeInOut', repeat: Infinity, repeatType: 'mirror' }
        }
    }
  },

};
