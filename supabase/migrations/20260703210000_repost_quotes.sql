-- Add optional quote text to reposts (quote-repost).
alter table reposts add column if not exists quote_text text;

alter table reposts add constraint reposts_quote_text_length
  check (quote_text is null or char_length(quote_text) between 1 and 500);
