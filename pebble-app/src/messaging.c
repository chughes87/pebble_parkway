#include "messaging.h"

Film s_films[MAX_FILMS];
int s_film_count = 0;
bool s_loading = true;

static void (*s_on_update)(void);

static void inbox_received_handler(DictionaryIterator *iter, void *context) {
  Tuple *type_tuple = dict_find(iter, MSG_TYPE);
  if (!type_tuple) return;

  int msg_type = type_tuple->value->uint8;

  if (msg_type == TYPE_FILM_ITEM) {
    Tuple *idx_tuple = dict_find(iter, FILM_IDX);
    Tuple *title_tuple = dict_find(iter, FILM_TITLE);
    Tuple *time_tuple = dict_find(iter, FILM_TIME);
    Tuple *count_tuple = dict_find(iter, FILM_COUNT);

    if (!idx_tuple || !title_tuple || !time_tuple) return;

    int idx = idx_tuple->value->uint8;
    if (idx >= MAX_FILMS) return;

    strncpy(s_films[idx].title, title_tuple->value->cstring, TITLE_LEN - 1);
    s_films[idx].title[TITLE_LEN - 1] = '\0';
    strncpy(s_films[idx].time, time_tuple->value->cstring, TIME_LEN - 1);
    s_films[idx].time[TIME_LEN - 1] = '\0';
    s_films[idx].has_detail = false;

    if (count_tuple) {
      s_film_count = count_tuple->value->uint8;
    }

    if (s_on_update) s_on_update();

  } else if (msg_type == TYPE_DONE) {
    Tuple *count_tuple = dict_find(iter, FILM_COUNT);
    if (count_tuple) {
      s_film_count = count_tuple->value->uint8;
    }
    s_loading = false;
    if (s_on_update) s_on_update();

  } else if (msg_type == TYPE_DETAIL_DATA) {
    Tuple *idx_tuple = dict_find(iter, FILM_IDX);
    Tuple *title_tuple = dict_find(iter, DETAIL_TITLE);
    Tuple *rating_tuple = dict_find(iter, DETAIL_RATING);
    Tuple *runtime_tuple = dict_find(iter, DETAIL_RUNTIME);
    Tuple *desc_tuple = dict_find(iter, DETAIL_DESC);

    if (!idx_tuple) return;
    int idx = idx_tuple->value->uint8;
    if (idx >= MAX_FILMS) return;

    if (title_tuple) {
      strncpy(s_films[idx].detail_title, title_tuple->value->cstring, DETAIL_TITLE_LEN - 1);
      s_films[idx].detail_title[DETAIL_TITLE_LEN - 1] = '\0';
    }
    if (rating_tuple) {
      strncpy(s_films[idx].rating, rating_tuple->value->cstring, DETAIL_FIELD_LEN - 1);
      s_films[idx].rating[DETAIL_FIELD_LEN - 1] = '\0';
    }
    if (runtime_tuple) {
      strncpy(s_films[idx].runtime, runtime_tuple->value->cstring, DETAIL_FIELD_LEN - 1);
      s_films[idx].runtime[DETAIL_FIELD_LEN - 1] = '\0';
    }
    if (desc_tuple) {
      strncpy(s_films[idx].desc, desc_tuple->value->cstring, DETAIL_DESC_LEN - 1);
      s_films[idx].desc[DETAIL_DESC_LEN - 1] = '\0';
    }
    s_films[idx].has_detail = true;
  }
}

static void inbox_dropped_handler(AppMessageResult reason, void *context) {
  APP_LOG(APP_LOG_LEVEL_ERROR, "Message dropped: %d", reason);
}

void messaging_init(void (*on_update)(void)) {
  s_on_update = on_update;
  app_message_register_inbox_received(inbox_received_handler);
  app_message_register_inbox_dropped(inbox_dropped_handler);
  app_message_open(512, 64);
}

void messaging_deinit(void) {
  app_message_deregister_callbacks();
}
