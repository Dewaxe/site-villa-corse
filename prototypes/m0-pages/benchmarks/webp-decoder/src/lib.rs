use image_webp::WebPDecoder;
use std::{cell::RefCell, io::Cursor};

thread_local! {
    static INPUT: RefCell<Vec<u8>> = const { RefCell::new(Vec::new()) };
}

#[unsafe(no_mangle)]
pub extern "C" fn prepare_input(len: usize) -> *mut u8 {
    if len > 250_000 {
        return std::ptr::null_mut();
    }
    INPUT.with_borrow_mut(|bytes| {
        bytes.resize(len, 0);
        bytes.as_mut_ptr()
    })
}

#[unsafe(no_mangle)]
pub extern "C" fn decode_input() -> bool {
    INPUT.with_borrow(|bytes| {
        let Ok(mut decoder) = WebPDecoder::new(Cursor::new(bytes)) else {
            return false;
        };
        let (width, height) = decoder.dimensions();
        if !(1..=1600).contains(&width) || !(1..=1600).contains(&height) {
            return false;
        }
        let Some(size) = decoder.output_buffer_size() else {
            return false;
        };
        decoder.read_image(&mut vec![0; size]).is_ok()
    })
}
