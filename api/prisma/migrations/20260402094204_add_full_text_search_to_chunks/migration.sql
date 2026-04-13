ALTER TABLE document_chunks
ADD COLUMN content_tsv tsvector;

UPDATE document_chunks
SET content_tsv = to_tsvector('english', content);

CREATE INDEX document_chunks_tsv_idx
ON document_chunks
USING GIN (content_tsv);

CREATE FUNCTION update_content_tsv() RETURNS trigger AS $$
BEGIN
NEW.content_tsv := to_tsvector('english', NEW.content);
RETURN NEW;
END
$$ LANGUAGE plpgsql;


CREATE TRIGGER tsv_update_trigger
BEFORE INSERT OR UPDATE ON document_chunks
FOR EACH ROW
EXECUTE FUNCTION update_content_tsv();