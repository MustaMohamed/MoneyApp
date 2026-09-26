export const migration021 = {
  version: 21,
  up: `
    UPDATE categories
      SET color = CASE color
        WHEN '#1B2B4B' THEN '#5C7FC4'
        WHEN '#C9973A' THEN '#A2792C'
        WHEN '#3D7A5F' THEN '#478D6E'
        WHEN '#C0442A' THEN '#D5583E'
        WHEN '#4A2545' THEN '#B264A7'
        WHEN '#185FA5' THEN '#2381DF'
        WHEN '#D4830A' THEN '#B67009'
        WHEN '#2D7D6E' THEN '#338D7D'
        WHEN '#7B3F8C' THEN '#A866BA'
        WHEN '#C45C2A' THEN '#CC602C'
        WHEN '#4A6FA5' THEN '#5D81B6'
        WHEN '#7A8B3C' THEN '#76873A'
        WHEN '#4CAF82' THEN '#3E8F6A'
      END
      WHERE color IN (
        '#1B2B4B', '#C9973A', '#3D7A5F', '#C0442A', '#4A2545', '#185FA5', '#D4830A',
        '#2D7D6E', '#7B3F8C', '#C45C2A', '#4A6FA5', '#7A8B3C', '#4CAF82'
      );
  `,
};
