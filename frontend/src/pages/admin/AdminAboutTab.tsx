export default function AdminAboutTab() {
  return (
    <div className="space-y-6">

      {/* ── Mission card ──────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl px-6 py-7 sm:px-8"
        style={{ background: 'linear-gradient(135deg, #0d2e45 0%, #1a4f6d 55%, #1e6a96 100%)' }}
      >
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
            <ShieldCheckIcon className="h-5 w-5 text-white" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-white">ProxaScreen AI — Clinical Mission</h2>
            <p className="text-xs text-white/55">Prostate cancer risk stratification for Ugandan Health Centres III &amp; IV</p>
          </div>
        </div>
        <p className="max-w-3xl text-sm leading-relaxed text-white/80">
          ProxaScreen is an AI-powered clinical decision-support tool helping health workers at Health Centre
          III and IV facilities in Uganda identify men at elevated risk of prostate cancer — without laboratory
          tests. Prostate cancer is the most common cancer affecting Ugandan men, yet most cases are diagnosed
          at advanced, untreatable stages due to the absence of routine PSA testing and specialist urologists
          at first-contact facilities.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {GOALS.map((g) => (
            <div key={g.title} className="rounded-xl bg-white/10 px-4 py-3">
              <p className="text-xs font-semibold text-white">{g.title}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-white/60">{g.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── How it works + Dataset ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <CardHeader icon={<CogIcon />} title="How the Model Works" sub="Plain-language overview for clinical staff" />
          <ol className="mt-5 space-y-4">
            {STEPS.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                  style={{ backgroundColor: '#1a4f6d' }}
                >
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <CardHeader icon={<DatabaseIcon />} title="About the Dataset" sub="Training data origin and structure" />
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-gray-100">
              {DATASET_STATS.map((s) => (
                <div key={s.label} className="bg-white px-3 py-3 text-center">
                  <p className="text-xl font-bold" style={{ color: '#1a4f6d' }}>{s.value}</p>
                  <p className="mt-0.5 text-[10px] text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2.5">
              {RISK_CLASSES.map((rc) => (
                <div key={rc.label} className="flex items-center gap-3">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${rc.dot}`} />
                  <span className="flex-1 text-xs font-medium text-gray-700">{rc.label}</span>
                  <span className="text-xs text-gray-400">{rc.count.toLocaleString()} patients</span>
                  <span className="w-10 text-right text-xs font-semibold text-gray-600">{rc.pct}%</span>
                  <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-100">
                    <div className={`h-2 rounded-full ${rc.bar}`} style={{ width: `${rc.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="border-t border-gray-100 pt-3 text-xs leading-relaxed text-gray-500">
              The dataset is synthetic, designed to reflect realistic prostate cancer risk factor distributions
              in sub-Saharan Africa. The 4.2% High-risk class imbalance was resolved using SMOTE — applied to
              training data only to preserve honest test evaluation.
            </p>
          </div>
        </div>
      </div>

      {/* ── Models compared ───────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <CardHeader
          icon={<ChartBarIcon />}
          title="Machine Learning Models Compared"
          sub="Three models trained on identical preprocessing pipelines — best Macro F1 determines the final model"
        />
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {MODELS.map((m) => (
            <div
              key={m.name}
              className={`rounded-xl border p-4 ${m.notable ? 'border-primary/25 bg-primary/[0.03]' : 'border-gray-100'}`}
            >
              {m.badge && (
                <span className="mb-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                  {m.badge}
                </span>
              )}
              <p className="text-sm font-bold text-gray-900">{m.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">{m.desc}</p>
              <ul className="mt-3 space-y-1">
                {m.points.map((pt, i) => (
                  <li key={i} className="flex gap-1.5 text-xs text-gray-600">
                    <span className="mt-0.5 shrink-0 text-gray-300">•</span>
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3">
          <p className="text-xs leading-relaxed text-gray-600">
            <span className="font-semibold text-gray-900">Selection criterion:</span>{' '}
            The model with the highest Macro F1 score on the held-out test set is selected as the final model.
            Macro F1 gives equal weight to all three risk classes — protecting the rare but critical High-risk
            class from being deprioritized by a metric optimised only for the majority class.
          </p>
        </div>
      </div>

      {/* ── Evaluation approach + Model transparency ──────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <CardHeader icon={<TargetIcon />} title="Evaluation Approach" sub="How model performance was measured and validated" />
          <div className="mt-5 space-y-4">
            {METRICS.map((m) => (
              <div key={m.name} className="border-l-[3px] pl-3.5" style={{ borderColor: m.color }}>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">{m.name}</p>
                  {m.tag && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ background: m.tagBg, color: m.tagColor }}
                    >
                      {m.tag}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{m.desc}</p>
              </div>
            ))}
            <p className="border-t border-gray-100 pt-3 text-xs leading-relaxed text-gray-400">
              Pipeline: 80/20 stratified split → StandardScaler (train only) → SMOTE (train only) →
              Stratified 10-fold cross-validation → final test evaluation. Seed 42 ensures full reproducibility.
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <CardHeader icon={<EyeIcon />} title="Model Transparency" sub="How predictions are explained to clinicians" />
          <div className="mt-5 space-y-5">
            {TRANSPARENCY.map((t) => (
              <div key={t.title} className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
                  {t.icon}
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Features table ────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <CardHeader
          icon={<ListBulletIcon />}
          title="Features Used for Prediction"
          sub="12 clinically relevant features collectable during a standard consultation — no laboratory tests required"
        />
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-3 pr-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Group</th>
                <th className="pb-3 pr-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Feature</th>
                <th className="pb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Clinical Relevance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {FEATURES.map((f, i) => (
                <tr key={i} className="hover:bg-gray-50/50">
                  <td className="py-2.5 pr-4">
                    {f.showGroup && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{ background: f.groupBg, color: f.groupColor }}
                      >
                        {f.group}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 font-medium text-gray-800">
                    {f.name}
                    {f.engineered && (
                      <span className="ml-1.5 rounded bg-amber-50 px-1 py-0.5 text-[9px] font-semibold text-amber-600">
                        engineered
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-gray-500">{f.relevance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Important limitations ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
            <WarningTriangleIcon className="h-4 w-4 text-amber-700" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-amber-900">Important Limitations</h3>
            <p className="text-xs text-amber-700/70">Transparency about system constraints builds clinical trust</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2">
          {LIMITATIONS.map((l, i) => (
            <div key={i} className="flex gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
              <p className="text-xs leading-relaxed text-amber-900">
                <span className="font-semibold">{l.title}:</span> {l.desc}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 border-t border-amber-200/60 pt-3 text-[11px] leading-relaxed text-amber-800/70">
          This system does not diagnose prostate cancer. It stratifies risk based on non-laboratory clinical
          information to support referral decisions at HC III/IV level. All clinical decisions remain the
          responsibility of the qualified health professional.
        </p>
      </div>

    </div>
  )
}

// ── Data ──────────────────────────────────────────────────────────────────────

const GOALS = [
  { title: 'Risk Stratification', desc: 'Low / Medium / High classification per patient' },
  { title: 'Referral Support', desc: 'Guides discharge, follow-up, or urgent referral' },
  { title: 'Early Detection', desc: 'Flags risk before symptoms develop' },
  { title: 'Symptom Integration', desc: 'Post-prediction upward risk escalation layer' },
]

const STEPS = [
  { title: 'Clinician enters patient details', desc: 'Demographics, lifestyle factors, clinical history, and presenting symptoms collected during standard consultation.' },
  { title: 'AI model analyses 12 clinical features', desc: 'Machine learning model trained on 1,000 patient records computes a base risk probability for all three classes.' },
  { title: 'Symptom adjustment layer applied', desc: '15 clinical symptoms are individually weighted and can escalate the displayed risk level upward if clinically alarming.' },
  { title: 'Risk level and explanation delivered', desc: 'Clinician receives Low / Medium / High risk, the top contributing factors, and a tailored referral recommendation.' },
]

const DATASET_STATS = [
  { label: 'Total Patients', value: '1,000' },
  { label: 'Features Used', value: '12' },
  { label: 'Risk Classes', value: '3' },
]

const RISK_CLASSES = [
  { label: 'Low Risk',    count: 567, pct: 56.7, dot: 'bg-secondary', bar: 'bg-secondary' },
  { label: 'Medium Risk', count: 391, pct: 39.1, dot: 'bg-amber-400',  bar: 'bg-amber-400' },
  { label: 'High Risk',   count: 42,  pct: 4.2,  dot: 'bg-red-500',   bar: 'bg-red-500' },
]

const MODELS = [
  {
    name: 'Logistic Regression',
    notable: false,
    badge: 'Baseline',
    desc: 'Standard clinical ML baseline providing interpretable coefficient outputs and probability scores.',
    points: [
      'Simple, fast, and interpretable',
      'Assumes linear decision boundaries',
      'Used as performance benchmark only',
    ],
  },
  {
    name: 'Random Forest',
    notable: true,
    badge: 'Strong Performer',
    desc: 'Ensemble of decision trees handling complex non-linear feature relationships with built-in explainability.',
    points: [
      'Handles mixed feature types well',
      'Built-in feature importance scores',
      'Supports SHAP TreeExplainer directly',
    ],
  },
  {
    name: 'Gradient Boosting',
    notable: true,
    badge: 'Strong Performer',
    desc: 'Sequential ensemble method often achieving the highest accuracy on structured clinical tabular data.',
    points: [
      'Very high accuracy on tabular data',
      'Handles class imbalance effectively',
      'Uses directional explanation fallback for SHAP',
    ],
  },
]

const METRICS = [
  {
    name: 'High-risk Recall (Sensitivity)',
    color: '#ef4444',
    tag: 'Most Critical',
    tagBg: '#fee2e2',
    tagColor: '#b91c1c',
    desc: 'Of all truly High-risk patients, how many did the model correctly identify? A missed High-risk patient — a false negative — means someone needing urgent referral goes home without one. This is the most dangerous failure mode.',
  },
  {
    name: 'Macro F1 Score',
    color: '#1a4f6d',
    tag: 'Primary Metric',
    tagBg: '#dbeafe',
    tagColor: '#1e40af',
    desc: 'Average F1 across all three risk classes, weighted equally. Chosen because it protects the numerically rare High-risk class from being ignored — unlike overall accuracy, which rewards predicting the majority class.',
  },
  {
    name: 'Overall Accuracy',
    color: '#9ca3af',
    tag: null,
    tagBg: '',
    tagColor: '',
    desc: 'Percentage of all predictions correct. Reported for completeness but not the primary metric — a model always predicting "Low" would score ~57% accuracy while missing every High-risk patient.',
  },
  {
    name: 'Stratified 10-fold Cross-Validation',
    color: '#9ca3af',
    tag: null,
    tagBg: '',
    tagColor: '',
    desc: 'Applied to training data only. Detects overfitting and provides a reliable generalisation estimate before the held-out test set is touched. Low standard deviation across folds = consistent, dependable model.',
  },
]

const TRANSPARENCY = [
  {
    title: 'SHAP Explainability',
    icon: <BrainIcon className="h-4 w-4" />,
    desc: 'SHAP (SHapley Additive exPlanations) computes exactly how much each feature contributed to a specific prediction. For Random Forest, TreeExplainer is used directly. For Gradient Boosting, a feature-importance directional fallback is applied.',
  },
  {
    title: 'Top Contributing Factors',
    icon: <ListIcon className="h-4 w-4" />,
    desc: "Every prediction includes the top 5 features driving that specific patient's risk level — with direction (increasing or decreasing risk) and clinical significance explained in plain language.",
  },
  {
    title: 'Probability Confidence Scores',
    icon: <BarIcon className="h-4 w-4" />,
    desc: 'The model outputs probability scores for all three classes (P_Low, P_Medium, P_High) summing to 1.0. These are always visible — allowing clinicians to see model uncertainty, not just the predicted label.',
  },
]

const FEATURES = [
  { group: 'Demographics',    showGroup: true,  name: 'Age',                          engineered: false, relevance: 'Strongest non-modifiable risk factor; risk rises sharply after age 50',                           groupBg: '#eff6ff', groupColor: '#1d4ed8' },
  { group: 'Demographics',    showGroup: false, name: 'BMI',                          engineered: false, relevance: 'Elevated BMI linked to hormonal disruption and systemic inflammation',                            groupBg: '#eff6ff', groupColor: '#1d4ed8' },
  { group: 'Lifestyle',       showGroup: true,  name: 'Smoker status',                engineered: false, relevance: 'Associated with more aggressive prostate cancer and poorer treatment outcomes',                     groupBg: '#faf5ff', groupColor: '#7e22ce' },
  { group: 'Lifestyle',       showGroup: false, name: 'Alcohol consumption',          engineered: false, relevance: 'High intake linked to hormonal disruption and impaired immune surveillance',                       groupBg: '#faf5ff', groupColor: '#7e22ce' },
  { group: 'Lifestyle',       showGroup: false, name: 'Diet type',                    engineered: false, relevance: 'Fatty diet stimulates androgen pathways; healthy diet is protective',                              groupBg: '#faf5ff', groupColor: '#7e22ce' },
  { group: 'Lifestyle',       showGroup: false, name: 'Physical activity level',      engineered: false, relevance: 'Low activity disrupts hormone regulation and reduces immune competence',                           groupBg: '#faf5ff', groupColor: '#7e22ce' },
  { group: 'Clinical History',showGroup: true,  name: 'Family history (weighted score)', engineered: false, relevance: 'First-degree relative approximately doubles lifetime risk; scored 0.00–1.00 by relative',      groupBg: '#f0fdf4', groupColor: '#15803d' },
  { group: 'Clinical History',showGroup: false, name: 'Regular health checkup',       engineered: false, relevance: 'Irregular attendance leads to later-stage detection of asymptomatic early disease',               groupBg: '#f0fdf4', groupColor: '#15803d' },
  { group: 'Clinical History',showGroup: false, name: 'Prostate exam done',           engineered: false, relevance: 'No prior PSA or DRE is treated as a risk-increasing signal reflecting the HC III/IV access gap',  groupBg: '#f0fdf4', groupColor: '#15803d' },
  { group: 'Engineered',      showGroup: true,  name: 'BMI category',                 engineered: true,  relevance: 'WHO-standard classification: Underweight / Normal / Overweight / Obese',                          groupBg: '#fffbeb', groupColor: '#b45309' },
  { group: 'Engineered',      showGroup: false, name: 'Age group',                    engineered: true,  relevance: 'Clinical screening age bands with under-40 eligibility logic (Below 40 through 70+)',              groupBg: '#fffbeb', groupColor: '#b45309' },
  { group: 'Engineered',      showGroup: false, name: 'Risk factor count',            engineered: true,  relevance: 'Composite count (0–4) of primary binary risk factors: smoker, family history, no checkup, no exam', groupBg: '#fffbeb', groupColor: '#b45309' },
]

const LIMITATIONS = [
  { title: 'Synthetic training data',        desc: 'Trained on a synthetic dataset, not real clinical records. Prospective validation on actual Ugandan patient data is required before deployment at scale.' },
  { title: 'No PSA or DRE data',             desc: 'PSA testing and digital rectal examination are unavailable at HC III/IV — their absence reflects the clinical context, not a dataset flaw.' },
  { title: 'Small High-risk sample',         desc: 'Only 42 real High-risk patients existed before SMOTE balancing. SMOTE mitigates but does not replace the value of more real High-risk cases.' },
  { title: 'Not a diagnostic tool',          desc: 'This system stratifies risk to support referral decisions. A Low risk result does not rule out prostate cancer.' },
  { title: 'Clinical judgment takes precedence', desc: 'The system supports decision-making but does not replace it. Clinicians should override the model when examination findings indicate concern.' },
  { title: 'Expert-informed symptom weights', desc: 'Symptom weights are clinically informed but were not derived from a prospectively validated scoring instrument.' },
]

// ── Helper components ─────────────────────────────────────────────────────────

function CardHeader({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
        {icon}
      </span>
      <div>
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        <p className="mt-0.5 text-xs text-gray-400">{sub}</p>
      </div>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function ShieldCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  )
}

function CogIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.457 3.077l1.41-.513m14.095-5.13l1.41-.513M5.106 17.785l1.15-.964m11.49-9.642l1.149-.964M7.501 19.795l.75-1.3m7.5-12.99l.75-1.3m-6.063 16.658l.26-1.477m2.605-14.772l.26-1.477m0 17.706l-.26-1.477M10.698 4.614l-.26-1.477M16.5 19.794l-.75-1.299M7.5 4.205L12 12m6.894 5.785l-1.149-.964M6.256 7.178l-1.15-.964m15.352 8.864l-1.41-.513M4.954 9.435l-1.41-.514M12.002 12l-3.75 6.495" />
    </svg>
  )
}

function DatabaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    </svg>
  )
}

function ChartBarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  )
}

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.248-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
    </svg>
  )
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function ListBulletIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  )
}

function WarningTriangleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  )
}

function BrainIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
    </svg>
  )
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  )
}

function BarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
    </svg>
  )
}
