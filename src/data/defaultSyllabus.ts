import { MaterialCategory, SubjectAccentColor, SubjectIconKey } from '../types/study';

export interface SeedSubject {
  id: string;
  name: string;
  iconKey: SubjectIconKey;
  accentColor: SubjectAccentColor;
  order: number;
}

export interface SeedChapter {
  id: string;
  subjectId: string;
  chapterNumber: number;
  title: string;
  topics: string[];
}

export interface SeedMaterial {
  id: string;
  subjectId: string;
  title: string;
  category: MaterialCategory;
  description: string;
  pageCount: number;
}

export const DEFAULT_SUBJECTS: SeedSubject[] = [
  { id: 'physics', name: 'Physics', iconKey: 'atom', accentColor: 'blue', order: 1 },
  { id: 'chemistry', name: 'Chemistry', iconKey: 'flask', accentColor: 'amber', order: 2 },
  { id: 'biology', name: 'Biology', iconKey: 'dna', accentColor: 'emerald', order: 3 },
  { id: 'zoology', name: 'Zoology', iconKey: 'microscope', accentColor: 'rose', order: 4 },
];

export const DEFAULT_CHAPTERS: SeedChapter[] = [
  // PHYSICS (Class 12 NCERT)
  {
    id: 'phy_01',
    subjectId: 'physics',
    chapterNumber: 1,
    title: 'Electric Charges and Fields',
    topics: ["Coulomb's Law", 'Electric Field Lines', 'Electric Dipole', "Gauss's Theorem & Applications"],
  },
  {
    id: 'phy_02',
    subjectId: 'physics',
    chapterNumber: 2,
    title: 'Electrostatic Potential and Capacitance',
    topics: ['Equipotential Surfaces', 'Potential Energy', 'Parallel Plate Capacitor', 'Dielectrics & Polarization'],
  },
  {
    id: 'phy_03',
    subjectId: 'physics',
    chapterNumber: 3,
    title: 'Current Electricity',
    topics: ["Ohm's Law & Drift Velocity", "Kirchhoff's Rules", 'Wheatstone Bridge', 'EMF & Internal Resistance'],
  },
  {
    id: 'phy_04',
    subjectId: 'physics',
    chapterNumber: 4,
    title: 'Moving Charges and Magnetism',
    topics: ['Biot-Savart Law', "Ampere's Circuital Law", 'Lorentz Force', 'Moving Coil Galvanometer'],
  },
  {
    id: 'phy_05',
    subjectId: 'physics',
    chapterNumber: 5,
    title: 'Magnetism and Matter',
    topics: ['Bar Magnet as Equivalent Solenoid', 'Magnetic Properties of Materials', 'Dia, Para & Ferromagnetism'],
  },
  {
    id: 'phy_06',
    subjectId: 'physics',
    chapterNumber: 6,
    title: 'Electromagnetic Induction',
    topics: ["Faraday's Laws", "Lenz's Law", 'Motional EMF', 'Self & Mutual Inductance'],
  },
  {
    id: 'phy_07',
    subjectId: 'physics',
    chapterNumber: 7,
    title: 'Alternating Current',
    topics: ['RMS Values & Phasors', 'LCR Series Circuit', 'Resonance & Power Factor', 'Transformers'],
  },
  {
    id: 'phy_08',
    subjectId: 'physics',
    chapterNumber: 8,
    title: 'Electromagnetic Waves',
    topics: ['Displacement Current', 'Transverse Nature of EM Waves', 'Electromagnetic Spectrum'],
  },
  {
    id: 'phy_09',
    subjectId: 'physics',
    chapterNumber: 9,
    title: 'Ray Optics and Optical Instruments',
    topics: ['Total Internal Reflection', 'Lens Maker Formula', 'Refraction through Prism', 'Microscope & Telescope'],
  },
  {
    id: 'phy_10',
    subjectId: 'physics',
    chapterNumber: 10,
    title: 'Wave Optics',
    topics: ["Huygens' Principle", "Young's Double Slit Experiment", 'Diffraction at Single Slit', 'Polarization'],
  },
  {
    id: 'phy_11',
    subjectId: 'physics',
    chapterNumber: 11,
    title: 'Dual Nature of Radiation and Matter',
    topics: ['Photoelectric Effect', "Einstein's Photoelectric Equation", 'de Broglie Wavelength'],
  },
  {
    id: 'phy_12',
    subjectId: 'physics',
    chapterNumber: 12,
    title: 'Atoms and Nuclei',
    topics: ['Bohr Model of Hydrogen Atom', 'Mass-Energy Relation', 'Binding Energy Curve', 'Fission & Fusion'],
  },
  {
    id: 'phy_13',
    subjectId: 'physics',
    chapterNumber: 13,
    title: 'Semiconductor Electronics',
    topics: ['Intrinsic & Extrinsic Semiconductors', 'p-n Junction Diode', 'Half & Full Wave Rectifier'],
  },

  // CHEMISTRY (Class 12 NCERT)
  {
    id: 'chem_01',
    subjectId: 'chemistry',
    chapterNumber: 1,
    title: 'Solutions',
    topics: ["Raoult's Law", 'Ideal & Non-Ideal Solutions', 'Colligative Properties', "van't Hoff Factor"],
  },
  {
    id: 'chem_02',
    subjectId: 'chemistry',
    chapterNumber: 2,
    title: 'Electrochemistry',
    topics: ['Nernst Equation', "Kohlrausch's Law", 'Conductance of Electrolytic Solutions', 'Batteries & Fuel Cells'],
  },
  {
    id: 'chem_03',
    subjectId: 'chemistry',
    chapterNumber: 3,
    title: 'Chemical Kinetics',
    topics: ['Rate Law & Order of Reaction', 'Integrated Rate Equations', 'Half-Life', 'Arrhenius Equation'],
  },
  {
    id: 'chem_04',
    subjectId: 'chemistry',
    chapterNumber: 4,
    title: 'The d- and f-Block Elements',
    topics: ['Electronic Configurations', 'Transition Metal Properties', 'Lanthanoid Contraction', 'KMnO4 & K2Cr2O7'],
  },
  {
    id: 'chem_05',
    subjectId: 'chemistry',
    chapterNumber: 5,
    title: 'Coordination Compounds',
    topics: ["Werner's Theory", 'IUPAC Nomenclature', 'Valence Bond Theory', 'Crystal Field Theory'],
  },
  {
    id: 'chem_06',
    subjectId: 'chemistry',
    chapterNumber: 6,
    title: 'Haloalkanes and Haloarenes',
    topics: ['SN1 and SN2 Mechanisms', 'Optical Isomerism', 'Elimination Reactions', 'Polyhalogen Compounds'],
  },
  {
    id: 'chem_07',
    subjectId: 'chemistry',
    chapterNumber: 7,
    title: 'Alcohols, Phenols and Ethers',
    topics: ['Acidity of Phenols', 'Reimer-Tiemann & Kolbe Reactions', 'Williamson Synthesis'],
  },
  {
    id: 'chem_08',
    subjectId: 'chemistry',
    chapterNumber: 8,
    title: 'Aldehydes, Ketones and Carboxylic Acids',
    topics: ['Nucleophilic Addition', 'Aldol & Cannizzaro Reactions', 'Acidity of Carboxylic Acids'],
  },
  {
    id: 'chem_09',
    subjectId: 'chemistry',
    chapterNumber: 9,
    title: 'Amines',
    topics: ['Basic Character of Amines', 'Gabriel Phthalimide Synthesis', 'Diazonium Salts'],
  },
  {
    id: 'chem_10',
    subjectId: 'chemistry',
    chapterNumber: 10,
    title: 'Biomolecules',
    topics: ['Carbohydrates & Glucose Structure', 'Proteins & Peptide Bond', 'Nucleic Acids & Vitamins'],
  },

  // BIOLOGY (Botany, Genetics & Ecology)
  {
    id: 'bio_01',
    subjectId: 'biology',
    chapterNumber: 1,
    title: 'Sexual Reproduction in Flowering Plants',
    topics: ['Microsporogenesis', 'Megasporogenesis', 'Pollination & Double Fertilization', 'Seed & Fruit Development'],
  },
  {
    id: 'bio_02',
    subjectId: 'biology',
    chapterNumber: 2,
    title: 'Principles of Inheritance and Variation',
    topics: ["Mendel's Laws", 'Incomplete Dominance & Codominance', 'Chromosomal Theory', 'Pedigree Analysis'],
  },
  {
    id: 'bio_03',
    subjectId: 'biology',
    chapterNumber: 3,
    title: 'Molecular Basis of Inheritance',
    topics: ['DNA Structure & Packaging', 'Replication', 'Transcription & Genetic Code', 'Lac Operon & DNA Fingerprinting'],
  },
  {
    id: 'bio_04',
    subjectId: 'biology',
    chapterNumber: 4,
    title: 'Microbes in Human Welfare',
    topics: ['Household & Industrial Products', 'Sewage Treatment', 'Biogas Production', 'Biofertilizers'],
  },
  {
    id: 'bio_05',
    subjectId: 'biology',
    chapterNumber: 5,
    title: 'Organisms and Populations',
    topics: ['Population Attributes', 'Exponential & Logistic Growth', 'Population Interactions'],
  },
  {
    id: 'bio_06',
    subjectId: 'biology',
    chapterNumber: 6,
    title: 'Ecosystem',
    topics: ['Productivity & Decomposition', 'Energy Flow & Ecological Pyramids', 'Nutrient Cycling'],
  },
  {
    id: 'bio_07',
    subjectId: 'biology',
    chapterNumber: 7,
    title: 'Biodiversity and Conservation',
    topics: ['Patterns of Biodiversity', 'Loss of Biodiversity', 'In-Situ & Ex-Situ Conservation'],
  },

  // ZOOLOGY (Human Biology, Evolution & Biotech)
  {
    id: 'zoo_01',
    subjectId: 'zoology',
    chapterNumber: 1,
    title: 'Human Reproduction',
    topics: ['Male & Female Reproductive Systems', 'Gametogenesis', 'Menstrual Cycle', 'Embryonic Development & Parturition'],
  },
  {
    id: 'zoo_02',
    subjectId: 'zoology',
    chapterNumber: 2,
    title: 'Reproductive Health',
    topics: ['Population Stabilization & Birth Control', 'MTP & STIs', 'Infertility & ART (IVF, ZIFT, GIFT)'],
  },
  {
    id: 'zoo_03',
    subjectId: 'zoology',
    chapterNumber: 3,
    title: 'Evolution',
    topics: ['Origin of Life', 'Evidences of Evolution', 'Adaptive Radiation', 'Hardy-Weinberg Principle', 'Human Evolution'],
  },
  {
    id: 'zoo_04',
    subjectId: 'zoology',
    chapterNumber: 4,
    title: 'Human Health and Disease',
    topics: ['Common Infectious Diseases', 'Innate & Acquired Immunity', 'AIDS & Cancer', 'Drugs & Alcohol Abuse'],
  },
  {
    id: 'zoo_05',
    subjectId: 'zoology',
    chapterNumber: 5,
    title: 'Biotechnology: Principles and Processes',
    topics: ['Restriction Enzymes', 'Cloning Vectors', 'PCR Amplification', 'Bioreactors & Downstream Processing'],
  },
  {
    id: 'zoo_06',
    subjectId: 'zoology',
    chapterNumber: 6,
    title: 'Biotechnology and Its Applications',
    topics: ['Bt Cotton & RNA Interference', 'Genetically Engineered Insulin', 'Gene Therapy', 'Transgenic Animals & Biopiracy'],
  },
];

export const DEFAULT_MATERIALS: SeedMaterial[] = [
  {
    id: 'mat_physics_notes',
    subjectId: 'physics',
    title: 'Physics Notes',
    category: 'notes',
    description: 'Complete Class 12 Physics revision notes, key derivations, and formula reference covering Chapters 1–13.',
    pageCount: 6,
  },
  {
    id: 'mat_chemistry_notes',
    subjectId: 'chemistry',
    title: 'Chemistry Notes',
    category: 'notes',
    description: 'Physical, Inorganic & Organic Class 12 Chemistry key equations, named reactions, and NCERT summaries.',
    pageCount: 6,
  },
  {
    id: 'mat_biology_notes',
    subjectId: 'biology',
    title: 'Biology Notes',
    category: 'notes',
    description: 'Botany, Genetics, Molecular Inheritance, and Ecology high-yield Class 12 study summaries.',
    pageCount: 5,
  },
  {
    id: 'mat_zoology_notes',
    subjectId: 'zoology',
    title: 'Zoology Notes',
    category: 'notes',
    description: 'Human Reproduction, Evolution, Immunology, and Biotechnology concise Class 12 board exam notes.',
    pageCount: 5,
  },
  {
    id: 'mat_full_syllabus',
    subjectId: 'syllabus',
    title: 'Full Syllabus',
    category: 'syllabus',
    description: 'Complete Class 12 Science syllabus blueprint across Physics, Chemistry, Biology, and Zoology with your live progress.',
    pageCount: 4,
  },
];

export interface SubjectNoteSection {
  heading: string;
  bullets: string[];
  formulas?: string[];
}

export const SUBJECT_REVISION_CONTENT: Record<string, { subtitle: string; sections: SubjectNoteSection[] }> = {
  physics: {
    subtitle: 'Class 12 Physics — Core Concepts, Laws & High-Yield Formulas',
    sections: [
      {
        heading: '1. Electrostatics & Capacitance',
        bullets: [
          'Electric charge is quantized (q = +/- ne) and conserved in an isolated system.',
          'Electric field lines originate from positive charges, end on negative charges, and never intersect.',
          "Gauss's Law relates total electric flux through a closed surface directly to enclosed charge.",
          'Inserting a dielectric of constant K between capacitor plates increases capacitance by a factor of K.',
        ],
        formulas: [
          'F = (1 / 4 pi eps0) * (q1 * q2 / r^2)',
          'Flux = Integral(E . dA) = q_enclosed / eps0',
          'C = K * eps0 * A / d   |   U = 1/2 * C * V^2',
        ],
      },
      {
        heading: '2. Current Electricity & Magnetism',
        bullets: [
          'Drift velocity is directly proportional to applied electric field and relaxation time.',
          "Kirchhoff's Junction Rule conserves charge; Loop Rule conserves energy.",
          'A moving charge in a magnetic field experiences Lorentz force perpendicular to both velocity and B.',
          'Biot-Savart Law and Ampere Circuital Law determine magnetic fields of current distributions.',
        ],
        formulas: [
          'I = n * e * A * v_d   |   R = rho * L / A',
          'F = q(E + v x B)   |   B_solenoid = mu0 * n * I',
        ],
      },
      {
        heading: '3. Electromagnetic Induction & Alternating Current',
        bullets: [
          'Induced EMF equals negative rate of change of magnetic flux; Lenz Law ensures energy conservation.',
          'At resonance in a series LCR circuit, XL = XC, impedance Z = R (minimum), and current is maximum.',
          'Ideal transformer obeys Vs/Vp = Ns/Np = Ip/Is.',
        ],
        formulas: [
          'e = -d(Phi_B)/dt   |   Z = sqrt(R^2 + (XL - XC)^2)',
          'Resonant frequency: f0 = 1 / (2 * pi * sqrt(L * C))',
        ],
      },
      {
        heading: '4. Optics & Modern Physics',
        bullets: [
          'Total Internal Reflection occurs when light travels from denser to rarer medium with i > ic.',
          "Young's Double Slit Experiment produces equally spaced bright and dark interference fringes.",
          'Photoelectric stopping potential depends linearly on incident frequency, independent of intensity.',
          'Nuclear binding energy per nucleon peaks near Fe-56 (~8.75 MeV), explaining both fission and fusion.',
        ],
        formulas: [
          '1/f = (n - 1)(1/R1 - 1/R2)   |   beta = lambda * D / d',
          'K_max = h * nu - phi0   |   lambda = h / p',
        ],
      },
    ],
  },
  chemistry: {
    subtitle: 'Class 12 Chemistry — Physical Equations, Coordination & Named Organic Reactions',
    sections: [
      {
        heading: '1. Solutions, Electrochemistry & Kinetics',
        bullets: [
          "Raoult's Law: Partial vapor pressure of each volatile component is proportional to its mole fraction.",
          'Colligative properties depend solely on the number of solute particles, corrected by van t Hoff factor i.',
          'Nernst equation computes electrode potential at non-standard concentrations and temperatures.',
          'First-order reaction half-life is completely independent of initial reactant concentration.',
        ],
        formulas: [
          'Delta Tb = i * Kb * m   |   Pi = i * C * R * T',
          'E_cell = E0_cell - (0.0591 / n) * log10(Q) at 298 K',
          'k = (2.303 / t) * log10([R]0 / [R])   |   t_1/2 = 0.693 / k',
        ],
      },
      {
        heading: '2. d- & f-Block Elements and Coordination Chemistry',
        bullets: [
          'Transition metals exhibit variable oxidation states, colored ions (d-d transitions), and catalytic activity.',
          'Lanthanoid contraction arises from poor shielding by 4f electrons, making 4d and 5d radii similar.',
          'Strong field ligands (CN-, CO) cause larger crystal field splitting (Delta_o > P) yielding low-spin complexes.',
        ],
        formulas: [
          'Spin-only magnetic moment: mu = sqrt(n * (n + 2)) BM',
          'Spectrochemical order: I- < Br- < Cl- < F- < H2O < NH3 < en < CN- < CO',
        ],
      },
      {
        heading: '3. High-Yield Organic Named Reactions',
        bullets: [
          'SN1 proceeds via planar carbocation intermediate (racemization, 3 deg > 2 deg > 1 deg); SN2 gives Walden inversion.',
          'Reimer-Tiemann Reaction: Phenol + CHCl3 + aq. NaOH produces salicylaldehyde.',
          'Aldol Condensation: Aldehydes/ketones with alpha-hydrogen form beta-hydroxy carbonyls under dilute alkali.',
          'Cannizzaro Reaction: Aldehydes without alpha-hydrogen undergo self-oxidation and reduction with conc. alkali.',
          'Gabriel Phthalimide Synthesis selectively prepares pure aliphatic primary amines.',
        ],
      },
    ],
  },
  biology: {
    subtitle: 'Class 12 Biology — Flowering Plants, Genetics, Molecular Biology & Ecology',
    sections: [
      {
        heading: '1. Reproduction in Flowering Plants',
        bullets: [
          'Microsporogenesis forms haploid pollen grains inside pollen sacs; tapetum nourishes developing pollen.',
          'Typical angiosperm embryo sac is 7-celled, 8-nucleate (1 egg, 2 synergids, 3 antipodals, 1 central cell with 2 polar nuclei).',
          'Double fertilization combines syngamy (2n zygote) and triple fusion (3n Primary Endosperm Nucleus).',
        ],
      },
      {
        heading: '2. Genetics & Molecular Basis of Inheritance',
        bullets: [
          "Mendel's laws: Law of Dominance, Segregation (pure gametes), and Independent Assortment (9:3:3:1 dihybrid ratio).",
          'DNA replication is semiconservative (Meselson & Stahl), continuous on leading strand and discontinuous (Okazaki fragments) on lagging strand.',
          'Genetic code is triplet, universal, degenerate, non-overlapping, with AUG start and UAA/UAG/UGA stop codons.',
          'Lac Operon is an inducible operon regulated negatively by repressor protein binding the operator when lactose is absent.',
        ],
      },
      {
        heading: '3. Ecology, Ecosystems & Biodiversity',
        bullets: [
          'Verhulst-Pearl Logistic Growth: dN/dt = rN((K - N)/K), producing a sigmoid S-shaped curve.',
          'Lindeman 10% Law: Only ~10% of energy transfers from one trophic level to the next; energy pyramid is always upright.',
          'Biodiversity hotspots and Biosphere Reserves represent in-situ conservation; seed banks & cryo-preservation are ex-situ.',
        ],
      },
    ],
  },
  zoology: {
    subtitle: 'Class 12 Zoology — Human Physiology, Evolution, Health & Biotechnology',
    sections: [
      {
        heading: '1. Human Reproduction & Reproductive Health',
        bullets: [
          'Spermatogenesis produces 4 functional haploid spermatozoa per primary spermatocyte; oogenesis forms 1 ovum + polar bodies.',
          'LH surge around Day 14 triggers ovulation; corpus luteum secretes progesterone to maintain endometrium.',
          'Assisted Reproductive Technologies include IVF-ET (test-tube baby), ZIFT, IUT, GIFT, and ICSI.',
        ],
      },
      {
        heading: '2. Evolution & Human Health',
        bullets: [
          'Homologous organs indicate divergent evolution; analogous organs indicate convergent evolution.',
          'Hardy-Weinberg equilibrium: p^2 + 2pq + q^2 = 1 holds in absence of mutation, selection, drift, or migration.',
          'Humoral immunity is mediated by B-lymphocytes (antibodies IgG, IgA, IgM, IgE, IgD); cell-mediated immunity by T-lymphocytes.',
          'HIV is a retrovirus targeting helper T-lymphocytes (CD4+ cells), diagnosed via ELISA.',
        ],
      },
      {
        heading: '3. Biotechnology Principles & Applications',
        bullets: [
          'Restriction endonucleases recognize palindromic DNA sequences (e.g., EcoRI cuts GAATTC leaving sticky ends).',
          'PCR amplifies DNA exponentially through 3 cyclic steps: Denaturation, Annealing, and Extension (Taq polymerase).',
          'Bt cotton expresses CryIAc/CryIIAb toxin crystals from Bacillus thuringiensis active in alkaline insect gut.',
          'Human insulin (Humulin) was produced by Eli Lilly by assembling A and B chains linked via disulfide bonds.',
        ],
      },
    ],
  },
};
