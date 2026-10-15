export type RuleSource = {
  title: string;
  url: string;
  lastVerified: string;
};

const lastVerified = "2026-10-15";

export const sources = {
  incomeTax: {
    title: "Revenue: How your Income Tax is calculated",
    url: "https://www.revenue.ie/en/jobs-and-pensions/calculating-your-income-tax/how-income-tax-is-calculated.aspx",
    lastVerified,
  },
  employeeCredit: {
    title: "Revenue: Employee Tax Credit",
    url: "https://www.revenue.ie/en/personal-tax-credits-reliefs-and-exemptions/income-and-employment/employee-tax-credit/index.aspx",
    lastVerified,
  },
  ratesAndCredits: {
    title: "Revenue: Tax rates, bands and reliefs",
    url: "https://www.revenue.ie/en/personal-tax-credits-reliefs-and-exemptions/tax-relief-charts/index.aspx",
    lastVerified,
  },
  usc: {
    title: "Revenue: Standard rates and thresholds of USC",
    url: "https://www.revenue.ie/en/jobs-and-pensions/usc/standard-rates-thresholds.aspx",
    lastVerified,
  },
  cgt: {
    title: "Revenue: CGT payment and filing",
    url: "https://www.revenue.ie/en/gains-gifts-and-inheritance/transfering-an-asset/when-and-how-do-you-pay-and-file-cgt.aspx",
    lastVerified,
  },
  cgtRates: {
    title: "Revenue: 2026 standard CGT rate change",
    url: "https://www.revenue.ie/en/tax-professionals/ebrief/2026/no-1422026.aspx",
    lastVerified,
  },
  shareIdentification: {
    title: "Revenue: selling or disposing of shares",
    url: "https://www.revenue.ie/en/gains-gifts-and-inheritance/transfering-an-asset/selling-or-disposing-of-shares.aspx",
    lastVerified,
  },
  fundRate: {
    title: "Revenue: 2026 investment undertaking rate change",
    url: "https://www.revenue.ie/en/tax-professionals/ebrief/2026/no-0162026.aspx",
    lastVerified,
  },
  offshoreFunds: {
    title: "Revenue: equivalent offshore fund gains and eight-year events",
    url: "https://www.revenue.ie/en/tax-professionals/tdm/income-tax-capital-gains-tax-corporation-tax/part-27/27-04-01.pdf",
    lastVerified,
  },
  etfTransition: {
    title: "Revenue: ETF transitional eight-year treatment",
    url: "https://www.revenue.ie/en/tax-professionals/tdm/income-tax-capital-gains-tax-corporation-tax/part-27/27-01a-03.pdf",
    lastVerified,
  },
} as const satisfies Record<string, RuleSource>;
