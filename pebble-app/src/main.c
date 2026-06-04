#include <pebble.h>
#include "messaging.h"
#include "showtime_list.h"
#include "detail_view.h"

static Window *s_main_window;

static void on_data_update(void) {
  showtime_list_reload();
}

static void on_detail_received(void) {
  detail_view_push();
}

static void main_window_load(Window *window) {
  showtime_list_init(window);
}

static void main_window_unload(Window *window) {
  showtime_list_deinit();
}

static void init(void) {
  s_main_window = window_create();
  window_set_window_handlers(s_main_window, (WindowHandlers){
    .load = main_window_load,
    .unload = main_window_unload,
  });
  window_stack_push(s_main_window, true);

  messaging_init(on_data_update, on_detail_received);
}

static void deinit(void) {
  messaging_deinit();
  window_destroy(s_main_window);
}

int main(void) {
  init();
  app_event_loop();
  deinit();
}
