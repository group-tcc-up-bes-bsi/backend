USE tcc_bsi_bes;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  age INT
);

INSERT INTO users (name, email, age) VALUES
  ('João Silva', 'joao@example.com', 28),
  ('Maria Oliveira', 'maria@example.com', 34),
  ('Pedro Souza', 'pedro@example.com', 22),
  ('Ana Costa', 'ana@example.com', 30);
