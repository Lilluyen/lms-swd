package com.example.lms.service;

import com.example.lms.web.FieldErrors;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;
import java.util.*;
import javax.imageio.ImageIO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * Local disk storage for teacher uploads.
 *
 * Assumptions (not fixed by the spec, documented in the hand-off):
 * - thumbnails: JPG or PNG, at most 2 MB, validated by decoding the image;
 * - lesson files: PDF/Office/text/archive/media formats, at most 25 MB
 *   (spring.servlet.multipart.max-file-size is set slightly higher).
 */
@Service
public class StorageService {

  static final long THUMBNAIL_MAX = 2L * 1024 * 1024;
  static final long LESSON_FILE_MAX = 25L * 1024 * 1024;
  static final Set<String> LESSON_EXTENSIONS = Set.of(
    "pdf",
    "doc",
    "docx",
    "ppt",
    "pptx",
    "xls",
    "xlsx",
    "txt",
    "md",
    "zip",
    "mp4",
    "mp3",
    "png",
    "jpg",
    "jpeg",
    "webp"
  );

  private final Path root;

  public StorageService(@Value("${app.upload-dir:uploads}") String dir) {
    this.root = Paths.get(dir).toAbsolutePath().normalize();
    try {
      Files.createDirectories(root);
    } catch (IOException e) {
      throw new IllegalStateException("Không tạo được thư mục upload", e);
    }
  }

  public Path root() {
    return root;
  }

  public Map<String, Object> storeThumbnail(MultipartFile file) {
    if (file == null || file.isEmpty()) throw new FieldErrors(
      "cover",
      "Vui lòng chọn ảnh JPG hoặc PNG"
    );
    if (file.getSize() > THUMBNAIL_MAX) throw new FieldErrors(
      "cover",
      "Ảnh bìa tối đa 2 MB"
    );
    String ext = extension(file.getOriginalFilename());
    String type = file.getContentType() == null ? "" : file.getContentType();
    if (
      !(type.equals("image/jpeg") || type.equals("image/png")) ||
      !(ext.equals("jpg") || ext.equals("jpeg") || ext.equals("png"))
    ) throw new FieldErrors("cover", "Ảnh bìa phải là JPG hoặc PNG");
    try (InputStream in = file.getInputStream()) {
      if (ImageIO.read(in) == null) throw new FieldErrors(
        "cover",
        "Tệp không phải ảnh hợp lệ"
      );
    } catch (IOException e) {
      throw new FieldErrors("cover", "Không đọc được ảnh bìa");
    }
    return save(file, ext);
  }

  public Map<String, Object> storeLessonFile(MultipartFile file) {
    if (file == null || file.isEmpty()) throw new FieldErrors(
      "fileUrl",
      "Vui lòng chọn tệp bài học"
    );
    if (file.getSize() > LESSON_FILE_MAX) throw new FieldErrors(
      "fileUrl",
      "Tệp bài học tối đa 25 MB"
    );
    String ext = extension(file.getOriginalFilename());
    if (!LESSON_EXTENSIONS.contains(ext)) throw new FieldErrors(
      "fileUrl",
      "Định dạng tệp không được hỗ trợ (" + ext + ")"
    );
    return save(file, ext);
  }

  private Map<String, Object> save(MultipartFile file, String ext) {
    String stored = UUID.randomUUID() + "." + ext;
    try (InputStream in = file.getInputStream()) {
      Files.copy(in, root.resolve(stored), StandardCopyOption.REPLACE_EXISTING);
    } catch (IOException e) {
      throw new ResponseStatusException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "Không lưu được tệp lên máy chủ"
      );
    }
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("url", "/api/files/" + stored);
    out.put("name", file.getOriginalFilename());
    out.put("size", file.getSize());
    out.put("storedName", stored);
    return out;
  }

  public Path resolve(String storedName) {
    if (
      storedName == null ||
      !storedName.matches("[A-Za-z0-9._-]{1,120}") ||
      storedName.contains("..")
    ) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    Path file = root.resolve(storedName).normalize();
    if (!file.startsWith(root) || !Files.isRegularFile(file)) throw new ResponseStatusException(
      HttpStatus.NOT_FOUND
    );
    return file;
  }

  static String extension(String name) {
    if (name == null) return "";
    int dot = name.lastIndexOf('.');
    return dot < 0 ? "" : name.substring(dot + 1).toLowerCase(Locale.ROOT);
  }
}
