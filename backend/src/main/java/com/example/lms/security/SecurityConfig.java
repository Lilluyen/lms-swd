package com.example.lms.security;

import com.example.lms.entity.User;
import com.example.lms.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.cors.*;
import org.springframework.web.filter.OncePerRequestFilter;

@Configuration
public class SecurityConfig {

  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  CorsConfigurationSource cors(@Value("${app.frontend}") String origin) {
    CorsConfiguration c = new CorsConfiguration();
    c.setAllowedOrigins(List.of(origin));
    c.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
    c.setAllowedHeaders(List.of("*"));
    c.setAllowCredentials(true);
    UrlBasedCorsConfigurationSource s = new UrlBasedCorsConfigurationSource();
    s.registerCorsConfiguration("/**", c);
    return s;
  }

  @Bean
  SecurityFilterChain chain(
    HttpSecurity http,
    UserRepository users,
    @Value("${app.frontend}") String frontend
  ) throws Exception {
    return http
      .addFilterBefore(
        new OncePerRequestFilter() {
          @Override
          protected void doFilterInternal(
            jakarta.servlet.http.HttpServletRequest request,
            jakarta.servlet.http.HttpServletResponse response,
            FilterChain chain
          ) throws ServletException, IOException {
            var session = request.getSession(false);
            if (
              session != null &&
              session.getAttribute("uid") instanceof Long uid &&
              SecurityContextHolder.getContext().getAuthentication() == null
            ) {
              users
                .findById(uid)
                .ifPresent(user ->
                  SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(
                      user.email,
                      null,
                      List.of(new SimpleGrantedAuthority("ROLE_" + user.role))
                    )
                  )
                );
            }
            chain.doFilter(request, response);
          }
        },
        UsernamePasswordAuthenticationFilter.class
      )
      .cors(x -> {})
      .csrf(c ->
        c
          .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
          .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
          .ignoringRequestMatchers(
            "/api/payments/sepay-webhook",
            "/api/payments/payos/webhook"
          )
      )
      .authorizeHttpRequests(a ->
        a
          .requestMatchers(
            "/error",
            "/api/auth/**",
            "/api/payments/sepay-webhook",
            "/api/payments/payos/webhook",
            "/oauth2/**",
            "/login/oauth2/**"
          )
          .permitAll()
          .requestMatchers(HttpMethod.GET, "/api/courses/**")
          .permitAll()
          .anyRequest()
          .authenticated()
      )
      .exceptionHandling(e ->
        e
          .authenticationEntryPoint((req, res, ex) -> res.sendError(401))
          .accessDeniedHandler((req, res, ex) -> res.sendError(403))
      )
      .oauth2Login(o ->
        o.successHandler((req, res, auth) -> {
          var principal =
            (org.springframework.security.oauth2.core.user.OAuth2User) auth.getPrincipal();
          String email = principal.getAttribute("email");
          if (
            email == null ||
            !Boolean.TRUE.equals(principal.getAttribute("email_verified"))
          ) {
            res.sendError(403);
            return;
          }
          User u = users.findByEmail(email.toLowerCase()).orElse(null);
          if (u == null) {
            req.getSession().invalidate();
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
            res.sendRedirect(frontend + "/?authError=account-not-found");
            return;
          }
          req.getSession(true).setAttribute("uid", u.id);
          res.sendRedirect(frontend + "/dashboard");
        })
      )
      .logout(l ->
        l
          .logoutUrl("/api/auth/logout")
          .logoutSuccessHandler((req, res, auth) ->
            res.setStatus(HttpServletResponse.SC_NO_CONTENT)
          )
      )
      .build();
  }
}
