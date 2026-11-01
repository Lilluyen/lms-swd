package com.example.lms.dto;

public record Credentials(
  String email,
  String password,
  String name,
  String role
) {}
