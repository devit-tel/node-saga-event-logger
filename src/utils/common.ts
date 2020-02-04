export const toNumber = (value: string, defaultValue: number = 0): number => {
  if (Number.isNaN(+value)) return defaultValue;
  return +value;
};

export const jsonTryParse = (jsonString: string, defaultValue: any = {}) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    return defaultValue;
  }
};

export const sleep = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));
