package com.example.lms.dto;

public record CredentialsRequest(
  String email,
  String password,
  String name,
  String role
) {}
