use image::{ImageBuffer, Rgba};
use serde::Serialize;

fn apply_kernel(
    kernel: &[f32; 9],
    image: &ImageBuffer<Rgba<u8>, Vec<u8>>,
    x: u32,
    y: u32,
) -> [f32; 3] {
    let kernel_dimension = 3;
    let mut rgb_accumulator = [0.0f32; 3]; // [Red, Green, Blue]

    for kernel_y in 0..kernel_dimension {
        for kernel_x in 0..kernel_dimension {
            let neighbor_x = x + kernel_x as u32 - 1;
            let neighbor_y = y + kernel_y as u32 - 1;
            let neighboring_pixel = image.get_pixel(neighbor_x, neighbor_y);

            for channel in 0..3 {
                rgb_accumulator[channel] += (neighboring_pixel[channel] as f32)
                    * kernel[kernel_y * kernel_dimension + kernel_x];
            }
        }
    }

    rgb_accumulator
}

fn clamp_rgb_values(rgb_accumulator: [f32; 3]) -> [u8; 3] {
    [
        rgb_accumulator[0].clamp(0.0, 255.0) as u8,
        rgb_accumulator[1].clamp(0.0, 255.0) as u8,
        rgb_accumulator[2].clamp(0.0, 255.0) as u8,
    ]
}

#[derive(Serialize)]
struct ProcessedImage {
    width: u32,
    height: u32,
    data: Vec<u8>,
}

#[tauri::command]
fn process_image(kernel: [f32; 9], image: Vec<u8>, width: u32, height: u32) -> ProcessedImage {
    let image_buffer = ImageBuffer::<Rgba<u8>, Vec<u8>>::from_raw(width, height, image).unwrap();
    let (image_width, image_height) = image_buffer.dimensions();
    let mut processed_image: ImageBuffer<Rgba<u8>, Vec<u8>> =
        ImageBuffer::new(image_width, image_height);

    for current_y in 1..(image_height - 1) {
        for current_x in 1..(image_width - 1) {
            let rgb_accumulator = apply_kernel(&kernel, &image_buffer, current_x, current_y);
            let [clamped_red, clamped_green, clamped_blue] = clamp_rgb_values(rgb_accumulator);
            let original_alpha = image_buffer.get_pixel(current_x, current_y)[3];
            let new_pixel = Rgba([clamped_red, clamped_green, clamped_blue, original_alpha]);
            processed_image.put_pixel(current_x, current_y, new_pixel);
        }
    }

    ProcessedImage {
        width: image_width,
        height: image_height,
        data: processed_image.into_raw(),
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![process_image])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
