package com.example.lms.controller;

import com.example.lms.service.StorageService;
import java.nio.file.Path;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Serves files stored by {@link StorageService}. Stored names are random UUIDs
 * and the route still requires an authenticated session.
 */
@RestController
public class FilesApi {

  private final StorageService storage;

  public FilesApi(StorageService storage) {
    this.storage = storage;
  }

  @GetMapping("/api/files/{name:.+}")
  ResponseEntity<Resource> file(@PathVariable String name) {
    Path path = storage.resolve(name);
    MediaType type = MediaTypeFactory.getMediaType(name).orElse(
      MediaType.APPLICATION_OCTET_STREAM
    );
    return ResponseEntity.ok()
      .contentType(type)
      .cacheControl(CacheControl.maxAge(java.time.Duration.ofHours(1)))
      .header("X-Content-Type-Options", "nosniff")
      .body(new FileSystemResource(path));
  }
}
