// Keep the Windows release app from opening an extra console window.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("Could not start Pa’O Typing Tutor");
}
