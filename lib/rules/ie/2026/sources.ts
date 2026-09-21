export type RuleSource = {
  title: string;
  url: string;
  lastVerified: string;
};

const lastVerified = "2026-09-21";

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
} as const satisfies Record<string, RuleSource>;
