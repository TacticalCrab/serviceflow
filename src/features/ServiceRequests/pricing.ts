type AdditionalCost = {
  price: number
  includeInFinalPrice?: boolean
}

function totalAdditionalExpenses(costs: AdditionalCost[] | undefined) {
  return (costs ?? []).reduce((total, cost) => total + cost.price, 0)
}

function totalIncludedInFinalPrice(costs: AdditionalCost[] | undefined) {
  return (costs ?? []).reduce(
    (total, cost) => total + (cost.includeInFinalPrice ? cost.price : 0),
    0
  )
}

function finalPrice(labor: number | undefined, costs: AdditionalCost[] | undefined) {
  if (labor === undefined && !(costs ?? []).some((cost) => cost.includeInFinalPrice)) {
    return undefined
  }

  return (labor ?? 0) + totalIncludedInFinalPrice(costs)
}

export {
  finalPrice,
  totalAdditionalExpenses,
  totalIncludedInFinalPrice,
}
