#include "messaging.h"

Train s_trains[MAX_TRAINS];
int s_train_count = 0;
bool s_loading = true;

static void (*s_on_update)(void);

static void inbox_received_handler(DictionaryIterator *iter, void *context) {
  Tuple *type_tuple = dict_find(iter, MSG_TYPE);
  if (!type_tuple) return;

  int msg_type = type_tuple->value->uint8;

  if (msg_type == TYPE_TRAIN_ITEM) {
    Tuple *idx_tuple = dict_find(iter, TRAIN_IDX);
    Tuple *dest_tuple = dict_find(iter, TRAIN_DEST);
    Tuple *mins_tuple = dict_find(iter, TRAIN_MINS);
    Tuple *color_tuple = dict_find(iter, TRAIN_COLOR);
    Tuple *count_tuple = dict_find(iter, TRAIN_COUNT);

    if (!idx_tuple || !dest_tuple || !mins_tuple) return;

    int idx = idx_tuple->value->uint8;
    if (idx >= MAX_TRAINS) return;

    strncpy(s_trains[idx].dest, dest_tuple->value->cstring, DEST_LEN - 1);
    s_trains[idx].dest[DEST_LEN - 1] = '\0';
    strncpy(s_trains[idx].mins, mins_tuple->value->cstring, MINS_LEN - 1);
    s_trains[idx].mins[MINS_LEN - 1] = '\0';

    if (color_tuple) {
      strncpy(s_trains[idx].color, color_tuple->value->cstring, COLOR_LEN - 1);
      s_trains[idx].color[COLOR_LEN - 1] = '\0';
    }

    if (count_tuple) {
      s_train_count = count_tuple->value->uint8;
    }

    if (s_on_update) s_on_update();

  } else if (msg_type == TYPE_DONE) {
    Tuple *count_tuple = dict_find(iter, TRAIN_COUNT);
    if (count_tuple) {
      s_train_count = count_tuple->value->uint8;
    }
    s_loading = false;
    if (s_on_update) s_on_update();
  }
}

static void inbox_dropped_handler(AppMessageResult reason, void *context) {
  APP_LOG(APP_LOG_LEVEL_ERROR, "Message dropped: %d", reason);
}

void messaging_init(void (*on_update)(void)) {
  s_on_update = on_update;
  app_message_register_inbox_received(inbox_received_handler);
  app_message_register_inbox_dropped(inbox_dropped_handler);
  app_message_open(256, 64);
}

void messaging_deinit(void) {
  app_message_deregister_callbacks();
}

void messaging_request_refresh(void) {
  s_loading = true;
  s_train_count = 0;
  if (s_on_update) s_on_update();

  DictionaryIterator *iter;
  AppMessageResult result = app_message_outbox_begin(&iter);
  if (result != APP_MSG_OK) return;

  dict_write_uint8(iter, MSG_TYPE, TYPE_REFRESH);
  app_message_outbox_send();
}
