export const migration020 = {
  version: 20,
  up: `
    UPDATE categories
      SET name = TRIM(name, ' ' || char(9) || char(10) || char(13))
      WHERE name <> TRIM(name, ' ' || char(9) || char(10) || char(13));

    UPDATE commitments
      SET name = TRIM(name, ' ' || char(9) || char(10) || char(13))
      WHERE name <> TRIM(name, ' ' || char(9) || char(10) || char(13));
  `,
};
